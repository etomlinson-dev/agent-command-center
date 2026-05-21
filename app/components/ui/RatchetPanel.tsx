"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "@/app/lib/game/state";
import type { RatchetResult } from "@/app/types/ratchet";

const VERDICT_COLORS: Record<string, string> = {
  kept: "#7FD642",
  reverted: "#F59E0B",
  skipped: "#555555",
};

const VERDICT_LABELS: Record<string, string> = {
  kept: "KEPT",
  reverted: "REVERTED",
  skipped: "SKIPPED",
};

export function RatchetPanel() {
  const open = useGameStore((s) => s.ratchetPanelOpen);
  const agentId = useGameStore((s) => s.ratchetPanelAgentId);
  const close = useGameStore((s) => s.closeRatchetPanel);
  const history = useGameStore((s) => s.ratchetHistory);
  const activeCycles = useGameStore((s) => s.activeCycles);
  const agents = useGameStore((s) => s.agents);

  const filtered = agentId
    ? history.filter((r) => r.agentId === agentId)
    : history;

  const agent = agentId ? agents.find((a) => a.id === agentId) : null;
  const agentCycles = agentId
    ? activeCycles.filter((c) => c.agentId === agentId)
    : activeCycles;

  const totalKept = filtered.filter((r) => r.verdict === "kept").length;
  const totalReverted = filtered.filter((r) => r.verdict === "reverted").length;
  const avgScore = filtered.length > 0
    ? filtered.reduce((sum, r) => sum + r.baselineScore, 0) / filtered.length
    : 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={close}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            className="glass-strong relative w-[640px] max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-[rgba(127,214,66,0.1)] flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-[var(--ce-text-primary)]">
                  {agent ? `${agent.name} — Ratchet History` : "Swarm Ratchet History"}
                </h2>
                <div className="flex items-center gap-4 mt-1">
                  <MiniStat label="Cycles" value={filtered.length} color="var(--ce-text-secondary)" />
                  <MiniStat label="Kept" value={totalKept} color="#7FD642" />
                  <MiniStat label="Reverted" value={totalReverted} color="#F59E0B" />
                  <MiniStat label="Avg Score" value={Math.round(avgScore)} color="var(--ce-green-bright)" />
                </div>
              </div>
              <button
                onClick={close}
                className="text-[var(--ce-text-secondary)] hover:text-[var(--ce-text-primary)] transition-colors text-lg"
              >
                ×
              </button>
            </div>

            {/* Active cycles */}
            {agentCycles.length > 0 && (
              <div className="px-5 py-3 border-b border-[rgba(127,214,66,0.1)] shrink-0">
                <div className="text-[10px] uppercase tracking-wider text-[var(--ce-green-primary)] font-semibold mb-2">
                  Active Cycles
                </div>
                {agentCycles.map((cycle) => (
                  <div key={cycle.id} className="flex items-center gap-2 py-1">
                    <div className="w-2 h-2 rounded-full bg-[var(--ce-green-primary)] animate-pulse" />
                    <span className="text-xs text-[var(--ce-text-primary)]">{cycle.agentName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(127,214,66,0.1)] text-[var(--ce-green-primary)] font-mono">
                      {cycle.phase}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* History list */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-2">
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-[var(--ce-text-secondary)] text-sm">
                  No ratchet cycles yet. Complete a task to trigger one.
                </div>
              ) : (
                filtered.map((result) => (
                  <RatchetResultCard key={result.id} result={result} />
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RatchetResultCard({ result }: { result: RatchetResult }) {
  const verdictColor = VERDICT_COLORS[result.verdict] ?? "#888";
  const verdictLabel = VERDICT_LABELS[result.verdict] ?? result.verdict;

  return (
    <div className="glass px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--ce-text-primary)]">
            {result.agentName}
          </span>
          <span
            className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
            style={{
              color: verdictColor,
              backgroundColor: `${verdictColor}15`,
              border: `1px solid ${verdictColor}30`,
            }}
          >
            {verdictLabel}
          </span>
        </div>
        <span className="text-[9px] text-[var(--ce-text-secondary)] tabular-nums font-mono">
          {new Date(result.timestamp).toLocaleTimeString()}
        </span>
      </div>

      {/* Score bar */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-[var(--ce-text-secondary)] w-10">Score</span>
        <div className="h-1.5 flex-1 rounded-full bg-[var(--ce-gray-mid)] overflow-hidden">
          <div className="flex h-full">
            <div
              className="h-full rounded-l-full transition-all"
              style={{
                width: `${result.baselineScore}%`,
                backgroundColor: "var(--ce-gray-light)",
              }}
            />
            {result.improvedScore != null && result.improvedScore > result.baselineScore && (
              <div
                className="h-full"
                style={{
                  width: `${result.improvedScore - result.baselineScore}%`,
                  backgroundColor: verdictColor,
                }}
              />
            )}
          </div>
        </div>
        <span className="text-[9px] font-mono tabular-nums" style={{ color: verdictColor }}>
          {result.baselineScore}
          {result.improvedScore != null ? ` → ${Math.round(result.improvedScore)}` : ""}
        </span>
      </div>

      {/* Improvements */}
      {result.improvements.length > 0 && (
        <div className="space-y-1 pt-1">
          {result.improvements.map((imp) => (
            <div key={imp.id} className="flex items-start gap-2 text-[10px]">
              <span
                className="shrink-0 px-1 py-0.5 rounded font-mono"
                style={{
                  color: "var(--ce-text-secondary)",
                  backgroundColor: "var(--ce-gray-mid)",
                }}
              >
                {imp.type.replace("_", " ")}
              </span>
              <span className="text-[var(--ce-text-primary)] leading-snug">
                {imp.description}
              </span>
              <span className="shrink-0 text-[var(--ce-text-secondary)] ml-auto">
                {(imp.confidence * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {result.xpAwarded > 0 && (
        <div className="text-[10px] font-semibold" style={{ color: "#7FD642" }}>
          +{result.xpAwarded} XP
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-[9px] uppercase tracking-wider text-[var(--ce-text-secondary)]">{label}</span>
      <span className="text-xs font-mono font-bold tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}
