"use client";

import { useEffect, useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "@/app/lib/game/state";

export function CommandPalette() {
  const open = useGameStore((s) => s.commandPaletteOpen);
  const toggle = useGameStore((s) => s.toggleCommandPalette);
  const agents = useGameStore((s) => s.agents);
  const selectAgent = useGameStore((s) => s.selectAgent);
  const submitSwarmTask = useGameStore((s) => s.submitSwarmTask);
  const connected = useGameStore((s) => s.connected);
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isTaskMode = query.startsWith("/task ") || query.startsWith("> ");
  const taskPrompt = isTaskMode ? query.replace(/^(\/task |> )/, "") : "";

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "Escape" && open) {
        toggle();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, toggle]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSubmitting(false);
    }
  }, [open]);

  async function handleSwarmSubmit() {
    if (!taskPrompt.trim() || submitting) return;
    setSubmitting(true);
    await submitSwarmTask(taskPrompt.trim());
    setSubmitting(false);
    toggle();
  }

  const filtered = useMemo(() => {
    if (!query) return agents.slice(0, 10);
    const q = query.toLowerCase();
    return agents
      .filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [query, agents]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={toggle}
          />
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="glass-strong fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-[480px] overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(127,214,66,0.1)]">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="shrink-0 text-[var(--ce-text-secondary)]"
              >
                <circle
                  cx="7"
                  cy="7"
                  r="5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M11 11L14 14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search agents, submit task..."
                className="flex-1 bg-transparent text-sm text-[var(--ce-text-primary)] placeholder:text-[var(--ce-text-secondary)] outline-none"
              />
              <kbd className="text-[10px] text-[var(--ce-text-secondary)] px-1.5 py-0.5 rounded border border-[var(--ce-gray-light)]">
                ESC
              </kbd>
            </div>

            <div className="max-h-[300px] overflow-y-auto scrollbar-thin p-1">
              {isTaskMode ? (
                <>
                  <button
                    onClick={handleSwarmSubmit}
                    disabled={!taskPrompt.trim() || !connected || submitting}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[var(--ce-gray-mid)] transition-colors text-left disabled:opacity-40"
                  >
                    <div className="w-6 h-6 rounded bg-[var(--ce-green-primary)] flex items-center justify-center text-[var(--ce-black)] text-xs font-bold shrink-0">
                      ⚡
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[var(--ce-text-primary)]">
                        {submitting ? "Submitting..." : "Submit to Swarm"}
                      </div>
                      <div className="text-[10px] text-[var(--ce-text-secondary)] truncate">
                        {taskPrompt || "Type a task after /task or >"}
                      </div>
                    </div>
                  </button>
                  {!connected && (
                    <div className="px-3 py-2 text-[10px] text-[var(--ce-status-error)]">
                      Backend not connected — tasks will fail
                    </div>
                  )}
                  <div className="px-3 py-2 border-t border-[rgba(127,214,66,0.05)]">
                    <div className="text-[9px] text-[var(--ce-text-secondary)] uppercase tracking-wider mb-1">
                      Or assign to agent
                    </div>
                  </div>
                  {filtered.slice(0, 5).map((agent) => (
                    <button
                      key={agent.id}
                      disabled={agent.status !== "idle" || !connected}
                      onClick={async () => {
                        if (!taskPrompt.trim()) return;
                        setSubmitting(true);
                        const store = useGameStore.getState();
                        await store.submitAgentTask(agent.id, taskPrompt.trim());
                        setSubmitting(false);
                        toggle();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--ce-gray-mid)] transition-colors text-left disabled:opacity-30"
                    >
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: agent.accentColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[var(--ce-text-primary)] truncate">
                          {agent.name}
                        </div>
                        <div className="text-[10px] text-[var(--ce-text-secondary)]">
                          {agent.role}
                        </div>
                      </div>
                      <StatusPill status={agent.status} />
                    </button>
                  ))}
                </>
              ) : (
                <>
                  {filtered.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => {
                        selectAgent(agent.id);
                        toggle();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--ce-gray-mid)] transition-colors text-left"
                    >
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: agent.accentColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[var(--ce-text-primary)] truncate">
                          {agent.name}
                        </div>
                        <div className="text-[10px] text-[var(--ce-text-secondary)]">
                          {agent.role} · {agent.category}
                        </div>
                      </div>
                      <StatusPill status={agent.status} />
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <div className="px-3 py-6 text-center text-sm text-[var(--ce-text-secondary)]">
                      No agents found
                    </div>
                  )}
                  {query === "" && (
                    <div className="px-3 py-2 border-t border-[rgba(127,214,66,0.05)] text-[9px] text-[var(--ce-text-secondary)]">
                      Tip: type <kbd className="px-1 rounded border border-[var(--ce-gray-light)]">/task</kbd> or <kbd className="px-1 rounded border border-[var(--ce-gray-light)]">&gt;</kbd> to submit a task
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    idle: "var(--ce-status-idle)",
    working: "var(--ce-status-working)",
    walking: "var(--ce-status-idle)",
    evolving: "var(--ce-status-evolving)",
    error: "var(--ce-status-error)",
    communicating: "var(--ce-status-communicating)",
  };
  const color = colors[status] ?? "var(--ce-status-idle)";

  return (
    <span
      className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded"
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
      }}
    >
      {status}
    </span>
  );
}
