export type TaskStatus = "pending" | "running" | "completed" | "failed";

export interface AgentTask {
  id: string;
  agentId: string;
  prompt: string;
  status: TaskStatus;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  result: string | null;
  error: string | null;
  costUsd: number | null;
  turns: number | null;
}
