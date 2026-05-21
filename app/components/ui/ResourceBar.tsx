"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useGameStore } from "@/app/lib/game/state";
import type { BackendMode } from "@/app/lib/game/state";

function useAnimatedValue(target: number, duration = 600): number {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  const startTimeRef = useRef(0);
  const frameRef = useRef(0);

  useEffect(() => {
    if (prevRef.current === target) return;
    const from = prevRef.current;
    prevRef.current = target;
    startTimeRef.current = Date.now();

    function tick() {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return display;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatCost(usd: number): string {
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  if (usd >= 0.01) return `$${usd.toFixed(3)}`;
  if (usd > 0) return `$${usd.toFixed(4)}`;
  return "$0.00";
}

export function ResourceBar() {
  const resources = useGameStore((s) => s.resources);
  const agents = useGameStore((s) => s.agents);
  const connected = useGameStore((s) => s.connected);
  const ratchetHistory = useGameStore((s) => s.ratchetHistory);
  const openRatchetPanel = useGameStore((s) => s.openRatchetPanel);
  const backendMode = useGameStore((s) => s.backendMode);
  const hasApiKey = useGameStore((s) => s.hasApiKey);
  const settingsOpen = useGameStore((s) => s.settingsOpen);
  const toggleSettings = useGameStore((s) => s.toggleSettings);
  const setBackendMode = useGameStore((s) => s.setBackendMode);
  const claude = resources.claude;
  const workingCount = agents.filter((a) => a.status === "working").length;
  const evolvingCount = agents.filter((a) => a.status === "evolving").length;
  const totalXP = agents.reduce((sum, a) => sum + a.xp, 0);
  const avgLevel = agents.length > 0
    ? (agents.reduce((sum, a) => sum + a.level, 0) / agents.length).toFixed(1)
    : "0";
  const ratchetKept = ratchetHistory.filter((r) => r.verdict === "kept").length;

  const animQueue = useAnimatedValue(resources.taskQueue);
  const animHealth = useAnimatedValue(resources.swarmHealth);
  const animKnowledge = useAnimatedValue(resources.knowledgeNotes);
  const animXP = useAnimatedValue(totalXP);
  const animRatchet = useAnimatedValue(ratchetKept);
  const animInputTokens = useAnimatedValue(claude.inputTokens);
  const animOutputTokens = useAnimatedValue(claude.outputTokens);

  return (
    <div className="glass fixed top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-5 px-5 py-3">
      <div className="flex items-center gap-1.5 min-w-[60px]">
        <div
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: connected ? "var(--ce-green-primary)" : "var(--ce-status-error)",
            boxShadow: connected ? "0 0 6px var(--ce-green-primary)" : "0 0 6px var(--ce-status-error)",
          }}
        />
        <span className="text-[10px] uppercase tracking-wider text-[var(--ce-text-secondary)]">
          {connected ? "Live" : "Offline"}
        </span>
      </div>
      <Divider />
      <div className="relative">
        <ModeToggle
          mode={backendMode}
          hasApiKey={hasApiKey}
          settingsOpen={settingsOpen}
          onToggleSettings={toggleSettings}
          onSetMode={setBackendMode}
        />
      </div>
      <Divider />
      <Metric
        label="Cost"
        value={formatCost(claude.totalCostUsd)}
        color="var(--ce-green-primary)"
      />
      <Divider />
      <Metric
        label="In Tokens"
        value={formatTokens(animInputTokens)}
        color="var(--ce-green-primary)"
      />
      <Divider />
      <Metric
        label="Out Tokens"
        value={formatTokens(animOutputTokens)}
        color="var(--ce-green-bright)"
      />
      <Divider />
      <Metric
        label="Sessions"
        value={`${claude.activeSessions}/${claude.totalSessions}`}
        color="var(--ce-status-communicating)"
      />
      <Divider />
      <Metric
        label="Active"
        value={`${workingCount}/${agents.length}`}
        color="var(--ce-green-bright)"
      />
      <Divider />
      <Metric
        label="Queue"
        value={String(animQueue)}
        color="var(--ce-status-communicating)"
      />
      <Divider />
      <Metric
        label="Health"
        value={`${animHealth}%`}
        color={resources.swarmHealth > 80 ? "var(--ce-green-primary)" : "var(--ce-status-error)"}
      />
      <Divider />
      <Metric
        label="Swarm XP"
        value={animXP.toLocaleString()}
        color="var(--ce-green-bright)"
      />
      <Divider />
      <Metric
        label="Avg Lvl"
        value={avgLevel}
        color="#FFD700"
      />
      <Divider />
      <button onClick={() => openRatchetPanel(null)} className="hover:brightness-125 transition-all">
        <Metric
          label="Ratchet"
          value={`${animRatchet}${evolvingCount > 0 ? ` ⟳${evolvingCount}` : ""}`}
          color="#A3E635"
        />
      </button>
    </div>
  );
}

function Metric({
  label,
  value,
  max,
  color,
  pct,
}: {
  label: string;
  value: string;
  max?: string;
  color: string;
  pct?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[70px]">
      <span className="text-[10px] uppercase tracking-wider text-[var(--ce-text-secondary)]">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span
          className="text-sm font-mono font-semibold tabular-nums"
          style={{ color }}
        >
          {value}
        </span>
        {max && (
          <span className="text-[10px] text-[var(--ce-text-secondary)]">
            / {max}
          </span>
        )}
      </div>
      {pct !== undefined && (
        <div className="w-full h-1 rounded-full bg-[var(--ce-gray-mid)] mt-0.5">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct * 100}%`, backgroundColor: color }}
          />
        </div>
      )}
    </div>
  );
}

function ModeToggle({
  mode,
  hasApiKey,
  settingsOpen,
  onToggleSettings,
  onSetMode,
}: {
  mode: BackendMode;
  hasApiKey: boolean;
  settingsOpen: boolean;
  onToggleSettings: () => void;
  onSetMode: (mode: BackendMode, apiKey?: string) => Promise<void>;
}) {
  const [apiKeyInput, setApiKeyInput] = useState("");
  const isApiMode = mode === "api-key";

  const handleSwitch = useCallback(async () => {
    if (isApiMode) {
      await onSetMode("claude-code");
    } else {
      if (hasApiKey) {
        await onSetMode("api-key");
      } else {
        onToggleSettings();
      }
    }
  }, [isApiMode, hasApiKey, onSetMode, onToggleSettings]);

  const handleSaveKey = useCallback(async () => {
    if (!apiKeyInput.trim()) return;
    await onSetMode("api-key", apiKeyInput.trim());
    setApiKeyInput("");
    onToggleSettings();
  }, [apiKeyInput, onSetMode, onToggleSettings]);

  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[90px]">
      <span className="text-[10px] uppercase tracking-wider text-[var(--ce-text-secondary)]">
        Backend
      </span>
      <button
        onClick={handleSwitch}
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-all hover:brightness-125"
        style={{
          backgroundColor: isApiMode ? "rgba(163, 230, 53, 0.15)" : "rgba(127, 214, 66, 0.15)",
          border: `1px solid ${isApiMode ? "#A3E635" : "#7FD642"}40`,
        }}
      >
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: isApiMode ? "#A3E635" : "#7FD642",
            boxShadow: `0 0 4px ${isApiMode ? "#A3E635" : "#7FD642"}`,
          }}
        />
        <span className="text-[11px] font-mono font-semibold" style={{ color: isApiMode ? "#A3E635" : "#7FD642" }}>
          {isApiMode ? "API" : "CC"}
        </span>
      </button>

      {settingsOpen && (
        <div
          className="glass absolute top-full mt-2 right-0 p-3 rounded-lg z-50 min-w-[260px]"
          style={{ border: "1px solid var(--ce-gray-light)" }}
        >
          <div className="text-[11px] uppercase tracking-wider text-[var(--ce-text-secondary)] mb-2">
            Backend Mode
          </div>

          <div className="flex gap-2 mb-3">
            <button
              onClick={() => onSetMode("claude-code")}
              className="flex-1 px-2 py-1.5 rounded text-[11px] font-mono transition-all"
              style={{
                backgroundColor: !isApiMode ? "rgba(127, 214, 66, 0.2)" : "transparent",
                border: `1px solid ${!isApiMode ? "#7FD642" : "var(--ce-gray-light)"}`,
                color: !isApiMode ? "#7FD642" : "var(--ce-text-secondary)",
              }}
            >
              Claude Code
            </button>
            <button
              onClick={() => hasApiKey ? onSetMode("api-key") : undefined}
              className="flex-1 px-2 py-1.5 rounded text-[11px] font-mono transition-all"
              style={{
                backgroundColor: isApiMode ? "rgba(163, 230, 53, 0.2)" : "transparent",
                border: `1px solid ${isApiMode ? "#A3E635" : "var(--ce-gray-light)"}`,
                color: isApiMode ? "#A3E635" : "var(--ce-text-secondary)",
                opacity: !hasApiKey && !isApiMode ? 0.5 : 1,
              }}
            >
              API Key
            </button>
          </div>

          <div className="text-[10px] text-[var(--ce-text-secondary)] mb-1.5">
            {hasApiKey ? "API key configured" : "Enter Anthropic API key"}
          </div>
          <div className="flex gap-1.5">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveKey()}
              placeholder="sk-ant-..."
              className="flex-1 px-2 py-1 rounded text-[11px] font-mono bg-[var(--ce-gray-darkest)] text-[var(--ce-text-primary)] border border-[var(--ce-gray-light)] outline-none focus:border-[var(--ce-green-primary)]"
            />
            <button
              onClick={handleSaveKey}
              className="px-2 py-1 rounded text-[10px] font-semibold uppercase transition-all hover:brightness-125"
              style={{
                backgroundColor: "rgba(127, 214, 66, 0.2)",
                color: "#7FD642",
                border: "1px solid #7FD64240",
              }}
            >
              Save
            </button>
          </div>

          <button
            onClick={onToggleSettings}
            className="mt-2 text-[10px] text-[var(--ce-text-secondary)] hover:text-[var(--ce-text-primary)] transition-colors w-full text-center"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

function Divider() {
  return <div className="w-px h-8 bg-[var(--ce-gray-light)] opacity-30" />;
}
