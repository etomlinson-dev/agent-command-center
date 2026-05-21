import { query } from "@anthropic-ai/claude-agent-sdk";
import type { SDKMessage, SDKResultMessage, Options, PermissionMode } from "@anthropic-ai/claude-agent-sdk";
import { getRegistry, type AgentProfile } from "./agent-registry";
import type { AgentTask } from "@/app/types/task";
import type { ClaudeUsage } from "@/app/types/game";
import { recordToolCall } from "@/app/lib/ratchet/trace-capture";
import { runRatchetCycle, getAgentConfig, getRatchetHistoryForAgent } from "@/app/lib/ratchet/ratchet-loop";
import { writeAllForRatchet } from "@/app/lib/obsidian/writer";
import { getBackendMode } from "@/app/lib/config";
import { runApiTask } from "./api-adapter";

interface ActiveSession {
  agentId: string;
  task: AgentTask;
  abortController: AbortController;
}

const activeSessions = new Map<string, ActiveSession>();

// --- Usage tracking ---

const usage: ClaudeUsage = {
  totalCostUsd: 0,
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  totalSessions: 0,
  activeSessions: 0,
};

type UsageCallback = (usage: ClaudeUsage) => void;
const usageListeners = new Set<UsageCallback>();

export function onUsageUpdate(cb: UsageCallback): () => void {
  usageListeners.add(cb);
  return () => usageListeners.delete(cb);
}

function emitUsage() {
  usage.activeSessions = activeSessions.size;
  for (const cb of usageListeners) {
    try { cb({ ...usage }); } catch { usageListeners.delete(cb); }
  }
}

export function getUsage(): ClaudeUsage {
  usage.activeSessions = activeSessions.size;
  return { ...usage };
}

function buildOptions(profile: AgentProfile, cwd: string): Partial<Options> {
  return {
    allowedTools: profile.allowedTools,
    permissionMode: (profile.permissionMode ?? "default") as PermissionMode,
    maxTurns: profile.maxTurns ?? 10,
    maxBudgetUsd: profile.maxBudgetUsd ?? 1.0,
    cwd,
    persistSession: false,
  };
}

export async function spawnAgentTask(
  agentId: string,
  prompt: string,
  cwd?: string,
): Promise<AgentTask> {
  const registry = getRegistry();
  const agent = registry.getAgent(agentId);
  if (!agent) throw new Error(`Agent ${agentId} not found`);

  if (activeSessions.has(agentId)) {
    throw new Error(`Agent ${agentId} already has an active session`);
  }

  const task: AgentTask = {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    agentId,
    prompt,
    status: "running",
    createdAt: Date.now(),
    startedAt: Date.now(),
    completedAt: null,
    result: null,
    error: null,
    costUsd: null,
    turns: null,
  };

  const abortController = new AbortController();
  activeSessions.set(agentId, { agentId, task, abortController });

  registry.setTask(agentId, task);
  registry.markReal(agentId, task.id);
  usage.totalSessions++;
  emitUsage();
  emitEvent({ type: "task_start", agentId, message: `${agent.data.name} started: ${prompt.slice(0, 80)}` });

  if (getBackendMode() === "api-key") {
    runApiSession(agentId, prompt, agent.profile, abortController).catch(() => {});
  } else {
    runSession(agentId, prompt, agent.profile, cwd ?? process.cwd(), abortController).catch(() => {});
  }

  return task;
}

async function runSession(
  agentId: string,
  prompt: string,
  profile: AgentProfile,
  cwd: string,
  abortController: AbortController,
) {
  const registry = getRegistry();
  const session = activeSessions.get(agentId);
  if (!session) return;

  try {
    const options = buildOptions(profile, cwd);
    const stream = query({
      prompt,
      options: { ...options, abortController } as Options,
    });

    for await (const message of stream) {
      handleMessage(agentId, message);

      if (isResult(message)) {
        const result = message as SDKResultMessage;
        session.task.completedAt = Date.now();
        session.task.turns = result.num_turns;
        session.task.costUsd = result.total_cost_usd;

        usage.totalCostUsd += result.total_cost_usd;
        if (result.usage) {
          usage.inputTokens += result.usage.input_tokens;
          usage.outputTokens += result.usage.output_tokens;
          usage.cacheReadTokens += result.usage.cache_read_input_tokens ?? 0;
          usage.cacheWriteTokens += result.usage.cache_creation_input_tokens ?? 0;
        }
        emitUsage();

        if (result.subtype === "success") {
          session.task.status = "completed";
          session.task.result = (result as { result: string }).result;
          registry.updateAgent(agentId, { status: "idle", health: Math.min(100, (registry.getAgent(agentId)?.data.health ?? 80) + 5) });
          emitEvent({ type: "task_complete", agentId, message: `${registry.getAgent(agentId)?.data.name} completed task` });
        } else {
          session.task.status = "failed";
          session.task.error = (result as { errors: string[] }).errors?.join("; ") ?? "Unknown error";
          registry.updateAgent(agentId, { status: "error" });
          emitEvent({ type: "agent_error", agentId, message: `${registry.getAgent(agentId)?.data.name} failed: ${session.task.error.slice(0, 80)}` });
        }
      }
    }
  } catch (err) {
    if (session.task.status === "running") {
      session.task.status = "failed";
      session.task.error = err instanceof Error ? err.message : String(err);
      session.task.completedAt = Date.now();
      registry.updateAgent(agentId, { status: "error" });
      emitEvent({ type: "agent_error", agentId, message: `${registry.getAgent(agentId)?.data.name} error: ${session.task.error.slice(0, 80)}` });
    }
  } finally {
    // Trigger ratchet loop after task completes (async, non-blocking)
    if (session.task.status === "completed" || session.task.status === "failed") {
      const agentData = registry.getAgent(agentId)?.data;
      if (agentData) {
        runRatchetCycle(agentData, session.task)
          .then(async (result) => {
            if (!result) return;

            // Update agent stats
            const stats = { ...agentData.stats };
            if (result.verdict === "kept") {
              stats.ratchetImprovements++;
              emitEvent({ type: "ratchet_kept", agentId, message: `${agentData.name} improved (${result.baselineScore} → ${Math.round(result.improvedScore ?? result.baselineScore)})` });
            } else if (result.verdict === "reverted") {
              stats.ratchetReverts++;
              emitEvent({ type: "ratchet_reverted", agentId, message: `${agentData.name} improvement reverted` });
            }
            registry.updateAgent(agentId, { stats });

            // Write to Obsidian vault (best-effort)
            if (result.evaluation && result.traceId) {
              const config = getAgentConfig(agentId);
              const allResults = getRatchetHistoryForAgent(agentId);
              const currentAgent = registry.getAgent(agentId)?.data;
              if (currentAgent && result.evaluation) {
                const trace = { id: result.traceId, agentId, agentName: agentData.name, category: agentData.category, taskId: session.task.id, prompt: session.task.prompt, toolCalls: [], turns: session.task.turns ?? 0, totalDurationMs: session.task.completedAt && session.task.startedAt ? session.task.completedAt - session.task.startedAt : 0, success: session.task.status === "completed", result: session.task.result, error: session.task.error, costUsd: session.task.costUsd ?? 0, timestamp: Date.now() };
                await writeAllForRatchet(currentAgent, config, trace, result.evaluation, result, allResults);
                emitEvent({ type: "vault_write", agentId, message: `${agentData.name} results written to vault` });
              }
            }
          })
          .catch(() => {});
      }
    }

    registry.setTask(agentId, null);
    activeSessions.delete(agentId);
    emitUsage();
  }
}

async function runApiSession(
  agentId: string,
  prompt: string,
  profile: AgentProfile,
  abortController: AbortController,
) {
  const registry = getRegistry();
  const session = activeSessions.get(agentId);
  if (!session) return;

  try {
    registry.updateAgent(agentId, { status: "working" });

    const result = await runApiTask(prompt, profile, {
      onText: () => {
        registry.updateAgent(agentId, { status: "working" });
      },
      onToolUse: (toolName) => {
        recordToolCall(agentId, { tool: toolName, args: {}, durationMs: 0, success: true });
      },
    }, abortController.signal, getAgentConfig(agentId)?.systemPromptSuffix);

    session.task.completedAt = Date.now();
    session.task.turns = result.turns;
    session.task.costUsd = result.costUsd;

    usage.totalCostUsd += result.costUsd;
    usage.inputTokens += result.inputTokens;
    usage.outputTokens += result.outputTokens;
    emitUsage();

    if (result.success) {
      session.task.status = "completed";
      session.task.result = result.result;
      registry.updateAgent(agentId, { status: "idle", health: Math.min(100, (registry.getAgent(agentId)?.data.health ?? 80) + 5) });
      emitEvent({ type: "task_complete", agentId, message: `${registry.getAgent(agentId)?.data.name} completed task` });
    } else {
      session.task.status = "failed";
      session.task.error = result.error ?? "Unknown error";
      registry.updateAgent(agentId, { status: "error" });
      emitEvent({ type: "agent_error", agentId, message: `${registry.getAgent(agentId)?.data.name} failed: ${(result.error ?? "").slice(0, 80)}` });
    }
  } catch (err) {
    if (session.task.status === "running") {
      session.task.status = "failed";
      session.task.error = err instanceof Error ? err.message : String(err);
      session.task.completedAt = Date.now();
      registry.updateAgent(agentId, { status: "error" });
      emitEvent({ type: "agent_error", agentId, message: `${registry.getAgent(agentId)?.data.name} error: ${session.task.error.slice(0, 80)}` });
    }
  } finally {
    if (session.task.status === "completed" || session.task.status === "failed") {
      const agentData = registry.getAgent(agentId)?.data;
      if (agentData) {
        runRatchetCycle(agentData, session.task)
          .then(async (ratchetResult) => {
            if (!ratchetResult) return;
            const stats = { ...agentData.stats };
            if (ratchetResult.verdict === "kept") {
              stats.ratchetImprovements++;
              emitEvent({ type: "ratchet_kept", agentId, message: `${agentData.name} improved (${ratchetResult.baselineScore} → ${Math.round(ratchetResult.improvedScore ?? ratchetResult.baselineScore)})` });
            } else if (ratchetResult.verdict === "reverted") {
              stats.ratchetReverts++;
              emitEvent({ type: "ratchet_reverted", agentId, message: `${agentData.name} improvement reverted` });
            }
            registry.updateAgent(agentId, { stats });

            if (ratchetResult.evaluation && ratchetResult.traceId) {
              const config = getAgentConfig(agentId);
              const allResults = getRatchetHistoryForAgent(agentId);
              const currentAgent = registry.getAgent(agentId)?.data;
              if (currentAgent && ratchetResult.evaluation) {
                const trace = { id: ratchetResult.traceId, agentId, agentName: agentData.name, category: agentData.category, taskId: session.task.id, prompt: session.task.prompt, toolCalls: [], turns: session.task.turns ?? 0, totalDurationMs: session.task.completedAt && session.task.startedAt ? session.task.completedAt - session.task.startedAt : 0, success: session.task.status === "completed", result: session.task.result, error: session.task.error, costUsd: session.task.costUsd ?? 0, timestamp: Date.now() };
                await writeAllForRatchet(currentAgent, config, trace, ratchetResult.evaluation, ratchetResult, allResults);
                emitEvent({ type: "vault_write", agentId, message: `${agentData.name} results written to vault` });
              }
            }
          })
          .catch(() => {});
      }
    }

    registry.setTask(agentId, null);
    activeSessions.delete(agentId);
    emitUsage();
  }
}

function handleMessage(agentId: string, message: SDKMessage) {
  const registry = getRegistry();

  if (message.type === "assistant") {
    registry.updateAgent(agentId, { status: "working" });
  }

  if (message.type === "tool_use_summary") {
    const toolMsg = message as SDKMessage & { tool_name?: string; duration_ms?: number; is_error?: boolean; error?: string };
    recordToolCall(agentId, {
      tool: toolMsg.tool_name ?? "unknown",
      args: {},
      durationMs: toolMsg.duration_ms ?? 0,
      success: !toolMsg.is_error,
      error: toolMsg.error,
    });
  }
}

function isResult(message: SDKMessage): boolean {
  return message.type === "result";
}

export function cancelAgentTask(agentId: string): boolean {
  const session = activeSessions.get(agentId);
  if (!session) return false;
  session.abortController.abort();
  return true;
}

export function getActiveSession(agentId: string): ActiveSession | undefined {
  return activeSessions.get(agentId);
}

export function getActiveSessions(): ActiveSession[] {
  return Array.from(activeSessions.values());
}

type EventCallback = (event: { type: string; agentId: string | null; message: string }) => void;
const eventListeners = new Set<EventCallback>();

export function onAgentEvent(cb: EventCallback): () => void {
  eventListeners.add(cb);
  return () => eventListeners.delete(cb);
}

function emitEvent(event: { type: string; agentId: string | null; message: string }) {
  for (const cb of eventListeners) {
    try {
      cb(event);
    } catch {
      eventListeners.delete(cb);
    }
  }
}
