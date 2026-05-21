import type { AgentCategory } from "./agent";

export type PlanStatus = "proposed" | "approved" | "running" | "completed" | "failed" | "revised";

export interface PlanAgentDependency {
  agentIndex: number;
  type: "blocks" | "provides-input";
}

export interface PlanAgent {
  agentId: string;
  agentName: string;
  role: string;
  category: AgentCategory;
  subtask: string;
  targetBuilding: string | null;
  accentColor: string;
  dependsOn: number[];
  status: "pending" | "running" | "completed" | "failed";
}

export interface HandoffEvent {
  id: string;
  planId: string;
  sourceAgentId: string;
  targetAgentId: string;
  sourceAgentName: string;
  targetAgentName: string;
  data: string;
  timestamp: number;
}

export interface ExecutionPlan {
  id: string;
  task: string;
  summary: string;
  status: PlanStatus;
  agents: PlanAgent[];
  handoffs: HandoffEvent[];
  estimatedComplexity: "low" | "medium" | "high";
  createdAt: number;
  approvedAt: number | null;
  completedAt: number | null;
}

export type CommandRole = "user" | "orchestrator" | "system";

export interface CommandMessage {
  id: string;
  role: CommandRole;
  content: string;
  timestamp: number;
  planId?: string;
}
