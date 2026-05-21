import type { AgentCategory } from "./agent";

// --- XP & Leveling ---

export const XP_THRESHOLDS: readonly number[] = [
  0,      // Level 1
  100,    // Level 2
  250,    // Level 3
  500,    // Level 4
  1000,   // Level 5
  2000,   // Level 6
  4000,   // Level 7
  7500,   // Level 8
  12000,  // Level 9
  20000,  // Level 10
] as const;

export const MAX_LEVEL = XP_THRESHOLDS.length;

export function levelFromXP(xp: number): number {
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= XP_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function xpForNextLevel(xp: number): { current: number; needed: number; progress: number } {
  const level = levelFromXP(xp);
  if (level >= MAX_LEVEL) return { current: xp, needed: 0, progress: 1 };
  const currentThreshold = XP_THRESHOLDS[level - 1];
  const nextThreshold = XP_THRESHOLDS[level];
  const earned = xp - currentThreshold;
  const needed = nextThreshold - currentThreshold;
  return { current: earned, needed, progress: earned / needed };
}

export type TaskComplexity = "low" | "medium" | "high";

export const BASE_XP: Record<TaskComplexity, number> = {
  low: 10,
  medium: 25,
  high: 50,
};

// --- Skill Trees ---

export type SkillTier = 1 | 2 | 3 | 4;

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  tier: SkillTier;
  xpRequired: number;
  prerequisiteIds: string[];
  unlocked: boolean;
  icon: string;
}

export interface SkillTree {
  category: AgentCategory;
  label: string;
  nodes: SkillNode[];
}

// --- Agent Performance Stats ---

export interface AgentStats {
  tasksCompleted: number;
  tasksFailed: number;
  totalIterations: number;
  avgIterations: number;
  ratchetImprovements: number;
  ratchetReverts: number;
  firstToolUses: Set<string> | string[];
}

export function defaultAgentStats(): AgentStats {
  return {
    tasksCompleted: 0,
    tasksFailed: 0,
    totalIterations: 0,
    avgIterations: 0,
    ratchetImprovements: 0,
    ratchetReverts: 0,
    firstToolUses: [],
  };
}

export function healthFromStats(stats: AgentStats): number {
  const totalTasks = stats.tasksCompleted + stats.tasksFailed;
  if (totalTasks === 0) return 85;

  const successRate = stats.tasksCompleted / totalTasks;
  const errorPenalty = (1 - successRate) * 40;
  const iterationPenalty = Math.min(stats.avgIterations / 20, 1) * 20;
  const ratchetBonus = Math.min(stats.ratchetImprovements * 3, 15);

  return Math.max(5, Math.min(100, 100 - errorPenalty - iterationPenalty + ratchetBonus));
}

// --- Floating XP Event ---

export interface FloatingXPEvent {
  id: string;
  agentId: string;
  amount: number;
  position: [number, number, number];
  timestamp: number;
  bonus?: string;
}

// --- XP Award Calculation ---

export interface XPAward {
  base: number;
  bonuses: { label: string; amount: number }[];
  total: number;
}

export function calculateXPAward(
  complexity: TaskComplexity,
  isFirstToolUse: boolean,
  isRatchetKept: boolean,
): XPAward {
  const base = BASE_XP[complexity];
  const bonuses: { label: string; amount: number }[] = [];

  if (isFirstToolUse) {
    bonuses.push({ label: "First tool use", amount: 15 });
  }
  if (isRatchetKept) {
    bonuses.push({ label: "Ratchet improvement", amount: 20 });
  }

  const total = base + bonuses.reduce((sum, b) => sum + b.amount, 0);
  return { base, bonuses, total };
}
