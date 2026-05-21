"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ExecutionPlan } from "@/app/types/plan";

interface ActiveTaskProps {
  plan: ExecutionPlan;
}

export function ActiveTask({ plan }: ActiveTaskProps) {
  const [expanded, setExpanded] = useState(false);

  const working = plan.agents.length;
  const isRunning = plan.status === "running" || plan.status === "approved";

  return (
    <div
      className="rounded-lg border border-[rgba(127,214,66,0.15)] overflow-hidden cursor-pointer"
      style={{ background: "rgba(20, 20, 20, 0.4)" }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="px-3 py-2 flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full shrink-0 ${isRunning ? "animate-pulse" : ""}`}
          style={{
            backgroundColor: isRunning
              ? "var(--ce-status-working)"
              : plan.status === "completed"
                ? "var(--ce-green-dim)"
                : "var(--ce-status-error)",
          }}
        />
        <span className="text-[11px] text-[var(--ce-text-primary)] truncate flex-1">
          {plan.summary}
        </span>
        <span className="text-[9px] text-[var(--ce-text-secondary)] shrink-0 tabular-nums">
          {working} agents
        </span>
        <span className="text-[9px] text-[var(--ce-text-secondary)]">
          {expanded ? "▾" : "▸"}
        </span>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2 space-y-1 border-t border-[rgba(127,214,66,0.1)] pt-2">
              {plan.agents.map((pa, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: pa.accentColor }}
                  />
                  <span className="text-[10px] text-[var(--ce-text-secondary)] truncate">
                    {pa.agentName}
                  </span>
                  <span className="text-[9px] text-[var(--ce-text-secondary)] ml-auto truncate max-w-[120px]">
                    {pa.subtask.slice(0, 40)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
