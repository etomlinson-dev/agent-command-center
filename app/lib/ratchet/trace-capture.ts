import type { Trace, ToolCall } from "@/app/types/ratchet";
import type { AgentTask } from "@/app/types/task";
import type { AgentData } from "@/app/types/agent";

const traces = new Map<string, Trace>();
const pendingToolCalls = new Map<string, ToolCall[]>();

export function recordToolCall(agentId: string, toolCall: ToolCall) {
  const calls = pendingToolCalls.get(agentId) ?? [];
  calls.push(toolCall);
  pendingToolCalls.set(agentId, calls);
}

export function captureTrace(agent: AgentData, task: AgentTask): Trace {
  const toolCalls = pendingToolCalls.get(agent.id) ?? [];
  pendingToolCalls.delete(agent.id);

  const trace: Trace = {
    id: `trace-${Date.now()}-${agent.id}`,
    agentId: agent.id,
    agentName: agent.name,
    category: agent.category,
    taskId: task.id,
    prompt: task.prompt,
    toolCalls,
    turns: task.turns ?? 0,
    totalDurationMs: task.completedAt && task.startedAt
      ? task.completedAt - task.startedAt
      : 0,
    success: task.status === "completed",
    result: task.result,
    error: task.error,
    costUsd: task.costUsd ?? 0,
    timestamp: Date.now(),
  };

  traces.set(trace.id, trace);
  return trace;
}

export function getTrace(traceId: string): Trace | undefined {
  return traces.get(traceId);
}

export function getTracesByAgent(agentId: string): Trace[] {
  return Array.from(traces.values())
    .filter((t) => t.agentId === agentId)
    .sort((a, b) => b.timestamp - a.timestamp);
}

export function getRecentTraces(limit = 50): Trace[] {
  return Array.from(traces.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

const MAX_TRACES = 500;

export function pruneTraces() {
  if (traces.size <= MAX_TRACES) return;
  const sorted = Array.from(traces.entries())
    .sort((a, b) => b[1].timestamp - a[1].timestamp);
  const toRemove = sorted.slice(MAX_TRACES);
  for (const [id] of toRemove) {
    traces.delete(id);
  }
}
