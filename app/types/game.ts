import type { AgentCategory } from "./agent";

export interface Building {
  id: string;
  name: string;
  category: AgentCategory;
  position: [number, number, number];
  size: [number, number, number];
  agentCount: number;
  isActive: boolean;
  glowIntensity: number;
}

export interface GameEvent {
  id: string;
  timestamp: number;
  type:
    | "task_complete"
    | "task_start"
    | "agent_evolve"
    | "agent_error"
    | "communication"
    | "system"
    | "level_up"
    | "skill_unlock"
    | "xp_gain"
    | "ratchet_start"
    | "ratchet_kept"
    | "ratchet_reverted"
    | "ratchet_skipped"
    | "vault_write";
  agentId: string | null;
  message: string;
  category: AgentCategory | null;
}

export interface ClaudeUsage {
  totalCostUsd: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalSessions: number;
  activeSessions: number;
}

export interface Resources {
  apiTokens: { used: number; total: number };
  taskQueue: number;
  swarmHealth: number;
  knowledgeNotes: number;
  claude: ClaudeUsage;
}
