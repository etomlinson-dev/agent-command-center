import type { AgentCategory } from "./agent";
import type { TaskComplexity } from "./gamification";

// --- Trace ---

export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
  durationMs: number;
  success: boolean;
  error?: string;
}

export interface Trace {
  id: string;
  agentId: string;
  agentName: string;
  category: AgentCategory;
  taskId: string;
  prompt: string;
  toolCalls: ToolCall[];
  turns: number;
  totalDurationMs: number;
  success: boolean;
  result: string | null;
  error: string | null;
  costUsd: number;
  timestamp: number;
}

// --- Evaluation ---

export interface Evaluation {
  traceId: string;
  agentId: string;
  score: number;
  breakdown: {
    successScore: number;
    efficiencyScore: number;
    costScore: number;
    errorPenalty: number;
  };
  complexity: TaskComplexity;
  flags: string[];
  timestamp: number;
}

// --- Improvement ---

export type ImprovementType = "prompt_refinement" | "tool_selection" | "workflow_pattern";

export interface ProposedImprovement {
  id: string;
  traceId: string;
  agentId: string;
  type: ImprovementType;
  description: string;
  before: string;
  after: string;
  confidence: number;
  reasoning: string;
}

// --- Ratchet Result ---

export type RatchetVerdict = "kept" | "reverted" | "skipped";

export interface RatchetResult {
  id: string;
  traceId: string;
  agentId: string;
  agentName: string;
  category: AgentCategory;
  evaluation: Evaluation;
  improvements: ProposedImprovement[];
  verdict: RatchetVerdict;
  baselineScore: number;
  improvedScore: number | null;
  xpAwarded: number;
  timestamp: number;
}

// --- Ratchet Cycle State ---

export type RatchetPhase =
  | "capturing"
  | "evaluating"
  | "improving"
  | "testing"
  | "finalizing"
  | "complete";

export interface ActiveRatchetCycle {
  id: string;
  agentId: string;
  agentName: string;
  phase: RatchetPhase;
  startedAt: number;
  trace?: Trace;
  evaluation?: Evaluation;
  improvements?: ProposedImprovement[];
}

// --- Obsidian Write Types ---

export type VaultNoteType =
  | "agent-profile"
  | "trace"
  | "improvement"
  | "metrics"
  | "task-log";

export interface VaultWriteRequest {
  noteType: VaultNoteType;
  agentId: string;
  agentName: string;
  category: AgentCategory;
  title: string;
  content: string;
  frontmatter: Record<string, unknown>;
}

// --- Agent Config (mutable by ratchet) ---

export interface AgentConfig {
  systemPromptSuffix: string;
  preferredTools: string[];
  workflowHints: string[];
  lastUpdated: number;
  improvementCount: number;
}

export function defaultAgentConfig(): AgentConfig {
  return {
    systemPromptSuffix: "",
    preferredTools: [],
    workflowHints: [],
    lastUpdated: Date.now(),
    improvementCount: 0,
  };
}
