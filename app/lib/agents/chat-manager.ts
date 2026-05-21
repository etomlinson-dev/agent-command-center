import { query } from "@anthropic-ai/claude-agent-sdk";
import type {
  SDKMessage,
  SDKAssistantMessage,
  SDKResultMessage,
  Options,
  PermissionMode,
} from "@anthropic-ai/claude-agent-sdk";
import { getRegistry, type AgentProfile } from "./agent-registry";
import { getActiveSession } from "./sdk-manager";
import type { ChatMessage } from "@/app/types/chat";

interface ChatSession {
  agentId: string;
  abortController: AbortController;
}

const chatSessions = new Map<string, ChatSession>();

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

function makeId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function extractAssistantMessages(agentId: string, msg: SDKAssistantMessage): ChatMessage[] {
  const results: ChatMessage[] = [];
  const content = msg.message?.content;

  if (!Array.isArray(content)) return results;

  for (const block of content) {
    if (block.type === "text" && "text" in block && typeof block.text === "string" && block.text.trim()) {
      results.push({
        id: makeId(),
        agentId,
        role: "assistant",
        content: block.text,
        timestamp: Date.now(),
      });
    } else if (block.type === "tool_use" && "name" in block) {
      const name = block.name as string;
      const input = "input" in block ? block.input : undefined;
      results.push({
        id: makeId(),
        agentId,
        role: "tool_use",
        content: `Using tool: ${name}`,
        timestamp: Date.now(),
        toolName: name,
        toolInput: input ? JSON.stringify(input, null, 2) : undefined,
      });
    }
  }

  return results;
}

function sdkMessageToChat(agentId: string, message: SDKMessage): ChatMessage[] {
  switch (message.type) {
    case "assistant": {
      return extractAssistantMessages(agentId, message);
    }

    case "tool_use_summary": {
      return [
        {
          id: makeId(),
          agentId,
          role: "tool_result",
          content: message.summary,
          timestamp: Date.now(),
        },
      ];
    }

    case "tool_progress": {
      return [
        {
          id: makeId(),
          agentId,
          role: "tool_result",
          content: `Running ${message.tool_name}... (${Math.round(message.elapsed_time_seconds)}s)`,
          timestamp: Date.now(),
          toolName: message.tool_name,
        },
      ];
    }

    case "result": {
      const result = message as SDKResultMessage;
      if (result.subtype === "success") {
        return [
          {
            id: makeId(),
            agentId,
            role: "result",
            content: result.result || "Completed",
            timestamp: Date.now(),
          },
        ];
      }
      const errors = "errors" in result && Array.isArray(result.errors)
        ? result.errors.join("; ")
        : "Task failed";
      return [
        {
          id: makeId(),
          agentId,
          role: "error",
          content: errors,
          timestamp: Date.now(),
        },
      ];
    }

    default:
      return [];
  }
}

export async function startChatStream(
  agentId: string,
  prompt: string,
  onMessage: (message: ChatMessage) => void,
  cwd?: string,
): Promise<void> {
  const registry = getRegistry();
  const agent = registry.getAgent(agentId);
  if (!agent) throw new Error(`Agent ${agentId} not found`);

  if (getActiveSession(agentId)) {
    throw new Error(`Agent ${agentId} has an active task session`);
  }

  if (chatSessions.has(agentId)) {
    throw new Error(`Agent ${agentId} already has an active chat session`);
  }

  const abortController = new AbortController();
  chatSessions.set(agentId, { agentId, abortController });

  registry.updateAgent(agentId, { status: "working", currentTask: prompt.slice(0, 60) });
  registry.markReal(agentId, `chat-${Date.now()}`);

  try {
    const options = buildOptions(agent.profile, cwd ?? process.cwd());
    const stream = query({
      prompt,
      options: { ...options, abortController } as Options,
    });

    for await (const message of stream) {
      const chatMessages = sdkMessageToChat(agentId, message);
      for (const chatMsg of chatMessages) {
        onMessage(chatMsg);
      }
    }
  } catch (err) {
    if (!abortController.signal.aborted) {
      onMessage({
        id: makeId(),
        agentId,
        role: "error",
        content: err instanceof Error ? err.message : String(err),
        timestamp: Date.now(),
      });
    }
  } finally {
    chatSessions.delete(agentId);
    registry.updateAgent(agentId, {
      status: "idle",
      currentTask: null,
      health: Math.min(100, (registry.getAgent(agentId)?.data.health ?? 80) + 3),
    });
  }
}

export function cancelChatSession(agentId: string): boolean {
  const session = chatSessions.get(agentId);
  if (!session) return false;
  session.abortController.abort();
  chatSessions.delete(agentId);
  return true;
}

export function hasChatSession(agentId: string): boolean {
  return chatSessions.has(agentId);
}
