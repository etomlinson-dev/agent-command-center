"use client";

import { motion } from "framer-motion";
import type { ExecutionPlan } from "@/app/types/plan";

interface PlanCardProps {
  plan: ExecutionPlan;
  onApprove: (planId: string) => void;
  onRevise: (planId: string) => void;
}

const COMPLEXITY_COLORS: Record<string, string> = {
  low: "var(--ce-green-primary)",
  medium: "#F59E0B",
  high: "var(--ce-status-error)",
};

function agentStatusConfig(status: string): { color: string; pulse: boolean } {
  switch (status) {
    case "running": return { color: "var(--ce-status-working)", pulse: true };
    case "completed": return { color: "var(--ce-green-primary)", pulse: false };
    case "failed": return { color: "var(--ce-status-error)", pulse: false };
    default: return { color: "var(--ce-gray-light)", pulse: false };
  }
}

export function PlanCard({ plan, onApprove, onRevise }: PlanCardProps) {
  const isProposed = plan.status === "proposed";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-lg border border-[rgba(127,214,66,0.2)] overflow-hidden"
      style={{ background: "rgba(20, 20, 20, 0.6)" }}
    >
      {/* Summary */}
      <div className="px-3 py-2 border-b border-[rgba(127,214,66,0.1)]">
        <div className="text-xs text-[var(--ce-text-primary)] font-medium">{plan.summary}</div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase"
            style={{
              color: COMPLEXITY_COLORS[plan.estimatedComplexity],
              backgroundColor: `${COMPLEXITY_COLORS[plan.estimatedComplexity]}15`,
              border: `1px solid ${COMPLEXITY_COLORS[plan.estimatedComplexity]}30`,
            }}
          >
            {plan.estimatedComplexity}
          </span>
          <span className="text-[9px] text-[var(--ce-text-secondary)]">
            {plan.agents.length} agents
          </span>
        </div>
      </div>

      {/* Agent assignments */}
      <div className="px-3 py-2 space-y-1.5">
        {plan.agents.map((pa, i) => {
          const statusIndicator = !isProposed ? agentStatusConfig(pa.status) : null;
          return (
            <div key={i} className="flex items-start gap-2">
              <div
                className={`w-2 h-2 rounded-full mt-1 shrink-0 ${statusIndicator?.pulse ? "animate-pulse" : ""}`}
                style={{ backgroundColor: statusIndicator?.color ?? pa.accentColor }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold text-[var(--ce-text-primary)]">
                  {pa.agentName}
                  <span className="font-normal text-[var(--ce-text-secondary)] ml-1">{pa.role}</span>
                </div>
                <div className="text-[10px] text-[var(--ce-text-secondary)] truncate">{pa.subtask}</div>
              </div>
              {pa.dependsOn.length > 0 && isProposed && (
                <span className="text-[8px] text-[var(--ce-text-secondary)] mt-1 shrink-0">
                  after #{pa.dependsOn.join(", #")}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      {isProposed && (
        <div className="px-3 py-2 border-t border-[rgba(127,214,66,0.1)] flex items-center gap-2">
          <button
            onClick={() => onApprove(plan.id)}
            className="flex-1 text-[10px] uppercase tracking-wider py-1.5 rounded bg-[var(--ce-green-primary)] text-[var(--ce-black)] font-semibold hover:brightness-110 transition-all"
          >
            Approve
          </button>
          <button
            onClick={() => onRevise(plan.id)}
            className="flex-1 text-[10px] uppercase tracking-wider py-1.5 rounded border border-[var(--ce-gray-light)] text-[var(--ce-text-secondary)] font-semibold hover:text-[var(--ce-text-primary)] hover:border-[var(--ce-text-secondary)] transition-all"
          >
            Revise
          </button>
        </div>
      )}

      {/* Running / completed status */}
      {!isProposed && (
        <div className="px-3 py-2 border-t border-[rgba(127,214,66,0.1)]">
          <StatusBadge status={plan.status} />
        </div>
      )}
    </motion.div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    running: { color: "var(--ce-status-working)", label: "Running..." },
    completed: { color: "var(--ce-green-primary)", label: "Completed" },
    failed: { color: "var(--ce-status-error)", label: "Failed" },
    approved: { color: "var(--ce-status-communicating)", label: "Starting..." },
    revised: { color: "var(--ce-text-secondary)", label: "Revised" },
  };
  const c = config[status] ?? config.running;

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`w-2 h-2 rounded-full ${status === "running" ? "animate-pulse" : ""}`}
        style={{ backgroundColor: c.color }}
      />
      <span className="text-[10px] font-semibold" style={{ color: c.color }}>
        {c.label}
      </span>
    </div>
  );
}
