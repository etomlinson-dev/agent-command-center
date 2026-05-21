"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "@/app/lib/game/state";
import { CATEGORY_META } from "@/app/types/agent";
import { xpForNextLevel } from "@/app/types/gamification";
import { AgentChat } from "./AgentChat";

export function AgentPanel() {
  const selectedAgentId = useGameStore((s) => s.selectedAgentId);
  const agents = useGameStore((s) => s.agents);
  const selectAgent = useGameStore((s) => s.selectAgent);
  const connected = useGameStore((s) => s.connected);
  const openSkillTree = useGameStore((s) => s.openSkillTree);
  const openRatchetPanel = useGameStore((s) => s.openRatchetPanel);

  const agent = agents.find((a) => a.id === selectedAgentId);

  return (
    <AnimatePresence>
      {agent && (
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="glass-strong fixed top-[100px] right-4 bottom-16 z-30 w-[380px] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-[rgba(127,214,66,0.1)] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: agent.accentColor }}
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--ce-text-primary)] truncate">
                  {agent.name}
                </div>
                <div className="text-[10px] text-[var(--ce-text-secondary)]">
                  {CATEGORY_META[agent.category].label}
                </div>
              </div>
            </div>
            <button
              onClick={() => selectAgent(null)}
              className="text-[var(--ce-text-secondary)] hover:text-[var(--ce-text-primary)] transition-colors text-lg leading-none shrink-0 ml-2"
            >
              ×
            </button>
          </div>

          {/* Compact stats row */}
          <div className="px-4 py-2 flex items-center gap-4 border-b border-[rgba(127,214,66,0.1)] shrink-0">
            <Stat label="Lvl" value={String(agent.level)} color={agent.accentColor} />
            <Stat label="XP" value={agent.xp.toLocaleString()} color="var(--ce-green-bright)" />
            <Stat
              label="HP"
              value={`${Math.round(agent.health)}%`}
              color={agent.health > 60 ? "var(--ce-green-primary)" : "var(--ce-status-error)"}
            />
            <Stat label="Tasks" value={String(agent.stats.tasksCompleted)} color="var(--ce-status-communicating)" />
            <div className="flex-1" />
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor:
                    agent.status === "working"
                      ? "var(--ce-status-working)"
                      : agent.status === "error"
                        ? "var(--ce-status-error)"
                        : agent.status === "evolving"
                          ? "var(--ce-status-evolving)"
                          : "var(--ce-status-idle)",
                }}
              />
              <span className="text-[10px] text-[var(--ce-text-secondary)] capitalize">
                {agent.status}
              </span>
            </div>
          </div>

          {/* Health + XP bars */}
          <div className="px-4 py-2 space-y-1.5 border-b border-[rgba(127,214,66,0.1)] shrink-0">
            {/* Health bar */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-wider text-[var(--ce-text-secondary)] w-6">HP</span>
              <div className="h-1.5 flex-1 rounded-full bg-[var(--ce-gray-mid)]">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${agent.health}%`,
                    backgroundColor:
                      agent.health > 60
                        ? "var(--ce-green-primary)"
                        : agent.health > 30
                          ? "#F59E0B"
                          : "var(--ce-status-error)",
                  }}
                />
              </div>
            </div>
            {/* XP progress to next level */}
            <XPProgressRow xp={agent.xp} accentColor={agent.accentColor} />
            {/* Skill tree button + skills count */}
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[9px] text-[var(--ce-text-secondary)]">
                {agent.skills.length} skill{agent.skills.length !== 1 ? "s" : ""} unlocked
                {" · "}
                {agent.stats.ratchetImprovements} improvement{agent.stats.ratchetImprovements !== 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openRatchetPanel(agent.id)}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded border transition-all"
                  style={{
                    color: "#A3E635",
                    borderColor: "rgba(163, 230, 53, 0.25)",
                    backgroundColor: "rgba(163, 230, 53, 0.06)",
                  }}
                >
                  Ratchet →
                </button>
                <button
                  onClick={() => openSkillTree(agent.id)}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded border transition-all"
                  style={{
                    color: agent.accentColor,
                    borderColor: `${agent.accentColor}40`,
                    backgroundColor: `${agent.accentColor}10`,
                  }}
                >
                  Skills →
                </button>
              </div>
            </div>
          </div>

          {/* Chat terminal — fills remaining space */}
          <div className="flex-1 min-h-0 flex flex-col">
            <AgentChat
              agentId={agent.id}
              agentName={agent.name}
              accentColor={agent.accentColor}
              connected={connected}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-[9px] uppercase tracking-wider text-[var(--ce-text-secondary)]">
        {label}
      </span>
      <span className="text-sm font-mono font-bold tabular-nums" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function XPProgressRow({ xp, accentColor }: { xp: number; accentColor: string }) {
  const prog = xpForNextLevel(xp);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] uppercase tracking-wider text-[var(--ce-text-secondary)] w-6">XP</span>
      <div className="h-1.5 flex-1 rounded-full bg-[var(--ce-gray-mid)]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${prog.progress * 100}%`, backgroundColor: accentColor }}
        />
      </div>
      {prog.needed > 0 && (
        <span className="text-[9px] font-mono tabular-nums text-[var(--ce-text-secondary)]">
          {prog.current}/{prog.needed}
        </span>
      )}
    </div>
  );
}
