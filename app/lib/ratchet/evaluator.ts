import type { Trace } from "@/app/types/ratchet";
import type { Evaluation } from "@/app/types/ratchet";
import type { TaskComplexity } from "@/app/types/gamification";

function inferComplexity(trace: Trace): TaskComplexity {
  if (trace.turns >= 15 || trace.toolCalls.length >= 20) return "high";
  if (trace.turns >= 5 || trace.toolCalls.length >= 8) return "medium";
  return "low";
}

const TURN_THRESHOLDS: Record<TaskComplexity, number> = {
  low: 3,
  medium: 8,
  high: 15,
};

const DURATION_THRESHOLDS_MS: Record<TaskComplexity, number> = {
  low: 30_000,
  medium: 120_000,
  high: 300_000,
};

const COST_THRESHOLDS_USD: Record<TaskComplexity, number> = {
  low: 0.1,
  medium: 0.5,
  high: 2.0,
};

export function evaluate(trace: Trace): Evaluation {
  const complexity = inferComplexity(trace);
  const flags: string[] = [];

  const successScore = trace.success ? 40 : 0;
  if (!trace.success) flags.push("task_failed");

  const turnThreshold = TURN_THRESHOLDS[complexity];
  const turnRatio = Math.min(trace.turns / Math.max(turnThreshold, 1), 2);
  const efficiencyScore = Math.round(30 * Math.max(0, 1 - (turnRatio - 1)));
  if (turnRatio > 1.5) flags.push("high_turn_count");

  const durationThreshold = DURATION_THRESHOLDS_MS[complexity];
  const costThreshold = COST_THRESHOLDS_USD[complexity];
  const costRatio = Math.min(trace.costUsd / Math.max(costThreshold, 0.01), 2);
  const durationRatio = Math.min(trace.totalDurationMs / Math.max(durationThreshold, 1), 2);
  const costScore = Math.round(20 * Math.max(0, 1 - Math.max(costRatio, durationRatio - 1)));
  if (costRatio > 1.5) flags.push("high_cost");
  if (durationRatio > 1.5) flags.push("slow_execution");

  const failedTools = trace.toolCalls.filter((tc) => !tc.success).length;
  const errorPenalty = Math.min(failedTools * 3, 10);
  if (failedTools > 0) flags.push("tool_errors");

  const score = Math.max(0, Math.min(100, successScore + efficiencyScore + costScore - errorPenalty));

  return {
    traceId: trace.id,
    agentId: trace.agentId,
    score,
    breakdown: {
      successScore,
      efficiencyScore,
      costScore,
      errorPenalty,
    },
    complexity,
    flags,
    timestamp: Date.now(),
  };
}
