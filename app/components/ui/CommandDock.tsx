"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "@/app/lib/game/state";
import { PlanCard } from "./PlanCard";
import { ActiveTask } from "./ActiveTask";

export function CommandDock() {
  const commandMessages = useGameStore((s) => s.commandMessages);
  const plans = useGameStore((s) => s.plans);
  const connected = useGameStore((s) => s.connected);
  const submitCommand = useGameStore((s) => s.submitCommand);
  const approvePlan = useGameStore((s) => s.approvePlan);
  const setPreviewPlan = useGameStore((s) => s.setPreviewPlan);

  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activePlans = plans.filter(
    (p) => p.status === "running" || p.status === "approved",
  );
  const proposedPlans = plans.filter((p) => p.status === "proposed");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [commandMessages, plans]);

  async function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed || submitting) return;
    setInput("");
    setSubmitting(true);
    await submitCommand(trimmed);
    setSubmitting(false);
  }

  function handleRevise(planId: string) {
    setPreviewPlan(null);
    useGameStore.getState().addCommandMessage({
      role: "system",
      content: "Plan dismissed. Describe what you'd like changed.",
    });
  }

  return (
    <div className="glass-strong fixed top-20 left-4 bottom-16 z-30 w-[340px] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[rgba(127,214,66,0.1)] flex items-center gap-2 shrink-0">
        <div className="w-2 h-2 rounded-full bg-[var(--ce-green-primary)]" />
        <span className="text-[11px] uppercase tracking-wider text-[var(--ce-text-secondary)] font-semibold">
          Command Center
        </span>
      </div>

      {/* Active tasks */}
      {activePlans.length > 0 && (
        <div className="px-3 py-2 border-b border-[rgba(127,214,66,0.1)] shrink-0 space-y-1.5">
          <div className="text-[9px] uppercase tracking-wider text-[var(--ce-text-secondary)] mb-1">
            Active ({activePlans.length})
          </div>
          {activePlans.map((plan) => (
            <ActiveTask key={plan.id} plan={plan} />
          ))}
        </div>
      )}

      {/* Conversation history */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2 space-y-2 min-h-0"
      >
        {commandMessages.length === 0 && proposedPlans.length === 0 && (
          <div className="text-[var(--ce-text-secondary)] text-[10px] py-8 text-center select-none">
            Type a task to dispatch your agent swarm
            <br />
            <span className="text-[9px] opacity-60">
              The orchestrator will break it down and assign agents
            </span>
          </div>
        )}

        <AnimatePresence initial={false}>
          {commandMessages.map((msg) => {
            if (msg.planId) {
              const plan = plans.find((p) => p.id === msg.planId);
              if (plan) {
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="text-[10px] text-[var(--ce-text-secondary)] mb-1">
                      Orchestrator proposed a plan:
                    </div>
                    <PlanCard
                      plan={plan}
                      onApprove={(id) => {
                        setPreviewPlan(null);
                        approvePlan(id);
                      }}
                      onRevise={handleRevise}
                    />
                  </motion.div>
                );
              }
            }

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.12 }}
              >
                <MessageBubble role={msg.role} content={msg.content} />
              </motion.div>
            );
          })}
        </AnimatePresence>

        {submitting && (
          <div className="text-[var(--ce-status-working)] text-[11px] animate-pulse">
            ● Analyzing task...
          </div>
        )}
      </div>

      {/* Command input */}
      <div
        className="border-t border-[rgba(127,214,66,0.1)] px-3 py-3 shrink-0"
        style={{ background: "rgba(20, 20, 20, 0.5)" }}
      >
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={
              !connected
                ? "Not connected"
                : submitting
                  ? "Planning..."
                  : "Describe a task for the swarm..."
            }
            disabled={!connected || submitting}
            rows={2}
            className="flex-1 bg-[var(--ce-black)] rounded-lg px-3 py-2 text-xs text-[var(--ce-text-primary)] placeholder:text-[var(--ce-text-secondary)] outline-none resize-none border border-[rgba(127,214,66,0.1)] focus:border-[rgba(127,214,66,0.3)] transition-colors disabled:opacity-40"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || !connected || submitting}
            className="self-end text-[10px] uppercase tracking-wider px-3 py-2 rounded-lg bg-[var(--ce-green-primary)] text-[var(--ce-black)] font-semibold hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        <div className="text-[9px] text-[var(--ce-text-secondary)] mt-1.5 opacity-60">
          Enter to send · Shift+Enter for newline
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ role, content }: { role: string; content: string }) {
  const styles: Record<string, { color: string; align: string }> = {
    user: { color: "var(--ce-green-bright)", align: "text-right" },
    orchestrator: { color: "var(--ce-text-primary)", align: "text-left" },
    system: { color: "var(--ce-text-secondary)", align: "text-left" },
  };
  const s = styles[role] ?? styles.system;

  if (role === "user") {
    return (
      <div className={s.align}>
        <span
          className="inline-block text-[11px] px-3 py-1.5 rounded-lg max-w-[90%]"
          style={{
            color: s.color,
            backgroundColor: "rgba(127, 214, 66, 0.08)",
            border: "1px solid rgba(127, 214, 66, 0.15)",
          }}
        >
          {content}
        </span>
      </div>
    );
  }

  return (
    <div className={s.align}>
      <span className="text-[11px]" style={{ color: s.color }}>
        {content}
      </span>
    </div>
  );
}
