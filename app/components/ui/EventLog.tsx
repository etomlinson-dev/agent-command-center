"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "@/app/lib/game/state";
import type { GameEvent } from "@/app/types/game";

const EVENT_COLORS: Record<GameEvent["type"], string> = {
  task_complete: "#7FD642",
  task_start: "#38BDF8",
  agent_evolve: "#A3E635",
  agent_error: "#E53E3E",
  communication: "#38BDF8",
  system: "#888888",
  level_up: "#FFD700",
  skill_unlock: "#A78BFA",
  xp_gain: "#A3E635",
  ratchet_start: "#A3E635",
  ratchet_kept: "#7FD642",
  ratchet_reverted: "#F59E0B",
  ratchet_skipped: "#555555",
  vault_write: "#A78BFA",
};

const EVENT_LABELS: Record<GameEvent["type"], string> = {
  task_complete: "DONE",
  task_start: "START",
  agent_evolve: "EVOLVE",
  agent_error: "ERROR",
  communication: "COMM",
  system: "SYS",
  level_up: "LVL UP",
  skill_unlock: "SKILL",
  xp_gain: "+XP",
  ratchet_start: "RATCHET",
  ratchet_kept: "KEPT",
  ratchet_reverted: "REVERT",
  ratchet_skipped: "SKIP",
  vault_write: "VAULT",
};

export function EventLog() {
  const events = useGameStore((s) => s.events);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AnimatePresence>
      {collapsed ? (
        <motion.button
          key="collapsed"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.15 }}
          onClick={() => setCollapsed(false)}
          className="glass fixed bottom-4 left-[360px] z-20 px-3 py-2 flex items-center gap-2 cursor-pointer hover:brightness-110 transition-all"
        >
          <div className="w-2 h-2 rounded-full bg-[var(--ce-green-primary)] animate-pulse" />
          <span className="text-[11px] uppercase tracking-wider text-[var(--ce-text-secondary)] font-semibold">
            Event Log
          </span>
          <span className="text-[10px] text-[var(--ce-text-secondary)] tabular-nums">
            ({events.length})
          </span>
        </motion.button>
      ) : (
        <motion.div
          key="expanded"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.15 }}
          className="glass fixed bottom-4 left-[360px] z-20 w-[380px] max-h-[240px] flex flex-col"
        >
          <div className="px-3 py-2 border-b border-[rgba(127,214,66,0.1)] flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--ce-green-primary)] animate-pulse" />
            <span className="text-[11px] uppercase tracking-wider text-[var(--ce-text-secondary)] font-semibold">
              Event Log
            </span>
            <button
              onClick={() => setCollapsed(true)}
              className="ml-auto text-[var(--ce-text-secondary)] hover:text-[var(--ce-text-primary)] transition-colors text-xs leading-none"
            >
              ×
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
            <AnimatePresence initial={false}>
              {events.map((evt) => (
                <motion.div
                  key={evt.id}
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="flex items-start gap-2 py-1 px-1"
                >
                  <span
                    className="shrink-0 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                    style={{
                      color: EVENT_COLORS[evt.type],
                      backgroundColor: `${EVENT_COLORS[evt.type]}15`,
                      border: `1px solid ${EVENT_COLORS[evt.type]}30`,
                    }}
                  >
                    {EVENT_LABELS[evt.type]}
                  </span>
                  <span className="text-[11px] text-[var(--ce-text-primary)] leading-snug">
                    {evt.message}
                  </span>
                  <span className="shrink-0 text-[9px] text-[var(--ce-text-secondary)] ml-auto tabular-nums">
                    {formatTime(evt.timestamp)}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function formatTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}
