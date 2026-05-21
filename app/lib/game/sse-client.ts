import type { AgentData } from "@/app/types/agent";
import type { GameEvent, ClaudeUsage } from "@/app/types/game";
import type { ExecutionPlan, HandoffEvent } from "@/app/types/plan";
import type { RatchetResult, RatchetPhase } from "@/app/types/ratchet";

interface RatchetSSEEvent {
  type: string;
  agentId: string;
  agentName: string;
  message: string;
  phase?: RatchetPhase;
  result?: RatchetResult;
  timestamp: number;
}

type SSECallback = {
  onAgentUpdate: (agentId: string, update: Partial<AgentData>) => void;
  onEvent: (event: Omit<GameEvent, "id" | "timestamp"> & { timestamp: number }) => void;
  onInit: (agents: AgentData[], plans: ExecutionPlan[], usage?: ClaudeUsage) => void;
  onPlanUpdate: (plan: ExecutionPlan) => void;
  onHandoff: (handoff: HandoffEvent) => void;
  onRatchet: (event: RatchetSSEEvent) => void;
  onUsage: (usage: ClaudeUsage) => void;
  onError: (error: Error) => void;
};

let eventSource: EventSource | null = null;

export function connectSSE(callbacks: SSECallback): () => void {
  if (eventSource) {
    eventSource.close();
  }

  eventSource = new EventSource("/api/agents/stream");

  eventSource.addEventListener("init", (e) => {
    try {
      const data = JSON.parse(e.data);
      callbacks.onInit(data.agents, data.plans ?? [], data.usage);
    } catch {
      // ignore parse errors
    }
  });

  eventSource.addEventListener("agent_update", (e) => {
    try {
      const data = JSON.parse(e.data);
      callbacks.onAgentUpdate(data.agentId, data.update);
    } catch {
      // ignore parse errors
    }
  });

  eventSource.addEventListener("event", (e) => {
    try {
      const data = JSON.parse(e.data);
      callbacks.onEvent(data);
    } catch {
      // ignore parse errors
    }
  });

  eventSource.addEventListener("plan_update", (e) => {
    try {
      const data = JSON.parse(e.data);
      callbacks.onPlanUpdate(data.plan);
    } catch {
      // ignore parse errors
    }
  });

  eventSource.addEventListener("handoff", (e) => {
    try {
      const data = JSON.parse(e.data);
      callbacks.onHandoff(data.handoff);
    } catch {
      // ignore parse errors
    }
  });

  eventSource.addEventListener("ratchet", (e) => {
    try {
      const data = JSON.parse(e.data) as RatchetSSEEvent;
      callbacks.onRatchet(data);
    } catch {
      // ignore parse errors
    }
  });

  eventSource.addEventListener("usage", (e) => {
    try {
      const data = JSON.parse(e.data);
      callbacks.onUsage(data.usage as ClaudeUsage);
    } catch {
      // ignore parse errors
    }
  });

  eventSource.onerror = () => {
    callbacks.onError(new Error("SSE connection lost"));
  };

  return () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
}

export async function submitTask(agentId: string, prompt: string): Promise<unknown> {
  const res = await fetch(`/api/agents/${agentId}/task`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  return res.json();
}

export async function cancelTask(agentId: string): Promise<unknown> {
  const res = await fetch(`/api/agents/${agentId}/task`, {
    method: "DELETE",
  });
  return res.json();
}

export async function submitSwarmTask(prompt: string, category?: string): Promise<unknown> {
  const res = await fetch("/api/swarm/task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, category }),
  });
  return res.json();
}
