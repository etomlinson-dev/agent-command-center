"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "@/app/lib/game/state";
import { CATEGORY_META } from "@/app/types/agent";
import type { AgentData } from "@/app/types/agent";

const STATUS_CONFIG: Record<string, { color: string; label: string; pulse: boolean }> = {
  idle: { color: "var(--ce-status-idle)", label: "Idle", pulse: false },
  walking: { color: "var(--ce-status-idle)", label: "Walking", pulse: false },
  working: { color: "var(--ce-status-working)", label: "Working", pulse: true },
  evolving: { color: "var(--ce-status-evolving)", label: "Evolving", pulse: true },
  error: { color: "var(--ce-status-error)", label: "Error", pulse: false },
  communicating: { color: "var(--ce-status-communicating)", label: "Comms", pulse: true },
};

export function BuildingInterior() {
  const selectedBuildingId = useGameStore((s) => s.selectedBuildingId);
  const buildings = useGameStore((s) => s.buildings);
  const agents = useGameStore((s) => s.agents);
  const selectBuilding = useGameStore((s) => s.selectBuilding);
  const selectAgent = useGameStore((s) => s.selectAgent);

  const building = buildings.find((b) => b.id === selectedBuildingId);
  const buildingAgents = building
    ? agents.filter((a) => a.category === building.category)
    : [];

  const workingCount = buildingAgents.filter((a) => a.status === "working").length;
  const idleCount = buildingAgents.filter((a) => a.status === "idle" || a.status === "walking").length;
  const errorCount = buildingAgents.filter((a) => a.status === "error").length;

  const meta = building ? CATEGORY_META[building.category] : null;

  return (
    <AnimatePresence>
      {building && meta && (
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="glass-strong fixed top-20 right-4 bottom-16 z-30 w-[380px] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-[rgba(127,214,66,0.1)] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: `${meta.color}15`,
                  border: `1px solid ${meta.color}30`,
                }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--ce-text-primary)] truncate">
                  {building.name}
                </div>
                <div className="text-[10px] text-[var(--ce-text-secondary)]">
                  {meta.label} · {buildingAgents.length} agents
                </div>
              </div>
            </div>
            <button
              onClick={() => selectBuilding(null)}
              className="text-[var(--ce-text-secondary)] hover:text-[var(--ce-text-primary)] transition-colors text-lg leading-none shrink-0 ml-2"
            >
              ×
            </button>
          </div>

          {/* Status summary bar */}
          <div className="px-4 py-2.5 flex items-center gap-4 border-b border-[rgba(127,214,66,0.1)] shrink-0">
            <StatusChip label="Working" count={workingCount} color="var(--ce-status-working)" />
            <StatusChip label="Idle" count={idleCount} color="var(--ce-status-idle)" />
            {errorCount > 0 && (
              <StatusChip label="Error" count={errorCount} color="var(--ce-status-error)" />
            )}
            <div className="flex-1" />
            <div className="text-[9px] text-[var(--ce-text-secondary)]">
              Avg HP: {Math.round(buildingAgents.reduce((s, a) => s + a.health, 0) / (buildingAgents.length || 1))}%
            </div>
          </div>

          {/* Agent list */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 space-y-1 min-h-0">
            {buildingAgents
              .sort((a, b) => {
                const order: Record<string, number> = { working: 0, error: 1, communicating: 2, evolving: 3, walking: 4, idle: 5 };
                return (order[a.status] ?? 9) - (order[b.status] ?? 9);
              })
              .map((agent) => (
                <AgentRow
                  key={agent.id}
                  agent={agent}
                  onSelect={() => selectAgent(agent.id)}
                />
              ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-[rgba(127,214,66,0.1)] shrink-0">
            <div className="text-[9px] text-[var(--ce-text-secondary)] opacity-60">
              Click an agent to open their terminal
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AgentRow({ agent, onSelect }: { agent: AgentData; onSelect: () => void }) {
  const status = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.idle;
  const healthPct = agent.health / 100;
  const healthColor = healthPct > 0.6 ? "#7FD642" : healthPct > 0.3 ? "#F59E0B" : "#E53E3E";

  return (
    <div
      onClick={onSelect}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all hover:bg-[rgba(127,214,66,0.05)] group"
      style={{ borderLeft: `2px solid ${agent.accentColor}30` }}
    >
      {/* Status dot */}
      <div
        className={`w-2 h-2 rounded-full shrink-0 ${status.pulse ? "animate-pulse" : ""}`}
        style={{ backgroundColor: status.color }}
      />

      {/* Agent info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-[var(--ce-text-primary)] truncate">
            {agent.name}
          </span>
          <span className="text-[9px] text-[var(--ce-text-secondary)] shrink-0">
            {agent.role}
          </span>
        </div>
        {agent.currentTask ? (
          <div className="text-[10px] text-[var(--ce-text-accent)] truncate mt-0.5">
            {agent.currentTask}
          </div>
        ) : (
          <div className="text-[10px] text-[var(--ce-text-secondary)] opacity-50 mt-0.5">
            {status.label}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[9px] font-mono tabular-nums text-[var(--ce-text-secondary)]">
          Lv.{agent.level}
        </span>
        <div className="w-12 h-1 rounded-full bg-[var(--ce-gray-mid)]">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${agent.health}%`, backgroundColor: healthColor }}
          />
        </div>
      </div>

      {/* Arrow on hover */}
      <span className="text-[var(--ce-text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity text-[10px] shrink-0">
        ›
      </span>
    </div>
  );
}

function StatusChip({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[10px] font-mono tabular-nums" style={{ color }}>
        {count}
      </span>
      <span className="text-[9px] text-[var(--ce-text-secondary)]">{label}</span>
    </div>
  );
}
