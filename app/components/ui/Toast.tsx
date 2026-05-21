"use client";

import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "@/app/lib/game/state";

interface ToastData {
  id: string;
  message: string;
  type: "success" | "info" | "error" | "level_up" | "skill" | "ratchet_kept" | "ratchet_reverted" | "vault";
}

const TYPE_COLORS: Record<ToastData["type"], string> = {
  success: "var(--ce-green-primary)",
  info: "var(--ce-status-communicating)",
  error: "var(--ce-status-error)",
  level_up: "#FFD700",
  skill: "#A78BFA",
  ratchet_kept: "#7FD642",
  ratchet_reverted: "#F59E0B",
  vault: "#A78BFA",
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const events = useGameStore((s) => s.events);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (events.length === 0) return;
    const latest = events[0];
    const type =
      latest.type === "agent_error"
        ? "error"
        : latest.type === "level_up"
          ? "level_up"
          : latest.type === "skill_unlock"
            ? "skill"
            : latest.type === "ratchet_kept"
              ? "ratchet_kept"
              : latest.type === "ratchet_reverted"
                ? "ratchet_reverted"
                : latest.type === "vault_write"
                  ? "vault"
                  : latest.type === "agent_evolve"
                    ? "success"
                    : "info";

    const toast: ToastData = {
      id: latest.id,
      message: latest.message,
      type,
    };

    setToasts((prev) => [toast, ...prev].slice(0, 5));

    const timer = setTimeout(() => dismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [events, dismiss]);

  return (
    <div className="fixed bottom-4 right-[200px] z-30 flex flex-col gap-2 items-end">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 40, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.9 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="glass px-4 py-2.5 max-w-[300px] cursor-pointer"
            style={
              toast.type === "level_up"
                ? { borderColor: "rgba(255, 215, 0, 0.3)", boxShadow: "0 0 16px rgba(255, 215, 0, 0.15)" }
                : toast.type === "skill" || toast.type === "vault"
                  ? { borderColor: "rgba(167, 139, 250, 0.3)", boxShadow: "0 0 12px rgba(167, 139, 250, 0.1)" }
                  : toast.type === "ratchet_kept"
                    ? { borderColor: "rgba(127, 214, 66, 0.3)", boxShadow: "0 0 16px rgba(127, 214, 66, 0.2)" }
                    : toast.type === "ratchet_reverted"
                      ? { borderColor: "rgba(245, 158, 11, 0.3)", boxShadow: "0 0 12px rgba(245, 158, 11, 0.1)" }
                      : undefined
            }
            onClick={() => dismiss(toast.id)}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: TYPE_COLORS[toast.type] }}
              />
              {toast.type === "level_up" && (
                <span className="text-[10px] font-bold" style={{ color: "#FFD700" }}>⬆</span>
              )}
              <span className="text-xs text-[var(--ce-text-primary)] leading-snug">
                {toast.message}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
