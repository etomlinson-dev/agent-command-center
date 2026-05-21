import type {
  Trace,
  RatchetResult,
  RatchetVerdict,
  ActiveRatchetCycle,
  AgentConfig,
  RatchetPhase,
} from "@/app/types/ratchet";
import type { AgentData } from "@/app/types/agent";
import type { AgentTask } from "@/app/types/task";
import { captureTrace, pruneTraces } from "./trace-capture";
import { evaluate } from "./evaluator";
import { proposeImprovements, applyImprovements } from "./improver";
import { defaultAgentConfig } from "@/app/types/ratchet";

const agentConfigs = new Map<string, AgentConfig>();
const ratchetHistory: RatchetResult[] = [];
const activeCycles = new Map<string, ActiveRatchetCycle>();

type RatchetEventCallback = (event: {
  type: string;
  agentId: string;
  agentName: string;
  message: string;
  phase?: RatchetPhase;
  result?: RatchetResult;
}) => void;

const listeners = new Set<RatchetEventCallback>();

export function onRatchetEvent(cb: RatchetEventCallback): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emit(event: Parameters<RatchetEventCallback>[0]) {
  for (const cb of listeners) {
    try { cb(event); } catch { listeners.delete(cb); }
  }
}

export function getAgentConfig(agentId: string): AgentConfig {
  let config = agentConfigs.get(agentId);
  if (!config) {
    config = defaultAgentConfig();
    agentConfigs.set(agentId, config);
  }
  return config;
}

export function getActiveCycles(): ActiveRatchetCycle[] {
  return Array.from(activeCycles.values());
}

export function getRatchetHistory(limit = 50): RatchetResult[] {
  return ratchetHistory.slice(-limit).reverse();
}

export function getRatchetHistoryForAgent(agentId: string, limit = 20): RatchetResult[] {
  return ratchetHistory
    .filter((r) => r.agentId === agentId)
    .slice(-limit)
    .reverse();
}

const KEEP_THRESHOLD = 60;
const IMPROVEMENT_DELTA_THRESHOLD = 5;

export async function runRatchetCycle(
  agent: AgentData,
  task: AgentTask,
): Promise<RatchetResult | null> {
  if (task.status !== "completed" && task.status !== "failed") return null;

  const cycleId = `ratchet-${Date.now()}-${agent.id}`;
  const cycle: ActiveRatchetCycle = {
    id: cycleId,
    agentId: agent.id,
    agentName: agent.name,
    phase: "capturing",
    startedAt: Date.now(),
  };
  activeCycles.set(cycleId, cycle);

  emit({
    type: "ratchet_start",
    agentId: agent.id,
    agentName: agent.name,
    message: `${agent.name} entering ratchet cycle`,
    phase: "capturing",
  });

  try {
    // Phase 1: Capture trace
    const trace = captureTrace(agent, task);
    cycle.trace = trace;
    cycle.phase = "evaluating";

    // Phase 2: Evaluate
    const evaluation = evaluate(trace);
    cycle.evaluation = evaluation;
    cycle.phase = "improving";

    const config = getAgentConfig(agent.id);
    const baselineScore = evaluation.score;

    // Phase 3: Propose improvements
    const improvements = await proposeImprovements(trace, evaluation, config);
    cycle.improvements = improvements;

    let verdict: RatchetVerdict;
    let improvedScore: number | null = null;
    let xpAwarded = 0;

    if (improvements.length === 0) {
      verdict = "skipped";
      emit({
        type: "ratchet_skipped",
        agentId: agent.id,
        agentName: agent.name,
        message: `${agent.name}: no improvements proposed (score: ${baselineScore})`,
      });
    } else {
      cycle.phase = "testing";

      // Apply improvements optimistically and check delta
      const proposedConfig = applyImprovements(config, improvements);
      improvedScore = Math.min(100, baselineScore + improvements.reduce((sum, imp) => sum + imp.confidence * 10, 0));

      if (improvedScore >= KEEP_THRESHOLD && (improvedScore - baselineScore) >= IMPROVEMENT_DELTA_THRESHOLD) {
        verdict = "kept";
        agentConfigs.set(agent.id, proposedConfig);
        xpAwarded = 20;
        emit({
          type: "ratchet_kept",
          agentId: agent.id,
          agentName: agent.name,
          message: `${agent.name} improved: ${baselineScore} → ${Math.round(improvedScore)} (+${improvements.length} changes)`,
        });
      } else {
        verdict = "reverted";
        emit({
          type: "ratchet_reverted",
          agentId: agent.id,
          agentName: agent.name,
          message: `${agent.name}: improvements reverted (delta too small: ${baselineScore} → ${Math.round(improvedScore ?? baselineScore)})`,
        });
      }
    }

    cycle.phase = "complete";

    const result: RatchetResult = {
      id: cycleId,
      traceId: trace.id,
      agentId: agent.id,
      agentName: agent.name,
      category: agent.category,
      evaluation,
      improvements,
      verdict,
      baselineScore,
      improvedScore,
      xpAwarded,
      timestamp: Date.now(),
    };

    ratchetHistory.push(result);
    if (ratchetHistory.length > 1000) ratchetHistory.splice(0, ratchetHistory.length - 500);

    pruneTraces();

    emit({
      type: `ratchet_${verdict}`,
      agentId: agent.id,
      agentName: agent.name,
      message: `${agent.name} ratchet complete: ${verdict} (score: ${baselineScore}${improvedScore != null ? ` → ${Math.round(improvedScore)}` : ""})`,
      result,
    });

    return result;
  } finally {
    activeCycles.delete(cycleId);
  }
}
