"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "@/app/lib/game/state";
import { getSkillTreeWithUnlocks } from "@/app/lib/game/skill-trees";
import { xpForNextLevel } from "@/app/types/gamification";
import type { SkillNode } from "@/app/types/gamification";
import type { AgentCategory } from "@/app/types/agent";

export function SkillTreePanel() {
  const skillTreeOpen = useGameStore((s) => s.skillTreeOpen);
  const skillTreeAgentId = useGameStore((s) => s.skillTreeAgentId);
  const agents = useGameStore((s) => s.agents);
  const closeSkillTree = useGameStore((s) => s.closeSkillTree);

  const agent = agents.find((a) => a.id === skillTreeAgentId);

  return (
    <AnimatePresence>
      {skillTreeOpen && agent && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeSkillTree}
          />

          <motion.div
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            className="glass-strong relative w-[440px] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-[rgba(127,214,66,0.15)] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: agent.accentColor }}
                  />
                  <span className="text-sm font-semibold text-[var(--ce-text-primary)]">
                    {agent.name}
                  </span>
                </div>
                <SkillTreeLabel category={agent.category} />
              </div>
              <button
                onClick={closeSkillTree}
                className="text-[var(--ce-text-secondary)] hover:text-[var(--ce-text-primary)] transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>

            {/* XP Progress */}
            <div className="px-5 py-3 border-b border-[rgba(127,214,66,0.1)]">
              <XPProgressBar xp={agent.xp} level={agent.level} accentColor={agent.accentColor} />
            </div>

            {/* Tree */}
            <div className="px-5 py-4">
              <SkillTreeGraph
                category={agent.category}
                unlockedSkillIds={agent.skills}
                agentXP={agent.xp}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SkillTreeLabel({ category }: { category: string }) {
  const tree = getSkillTreeWithUnlocks(category as AgentCategory, []);
  return (
    <div className="text-[10px] text-[var(--ce-text-secondary)] mt-0.5">
      {tree.label}
    </div>
  );
}

function XPProgressBar({
  xp,
  level,
  accentColor,
}: {
  xp: number;
  level: number;
  accentColor: string;
}) {
  const prog = xpForNextLevel(xp);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] uppercase tracking-wider text-[var(--ce-text-secondary)]">
          Lv
        </span>
        <span className="text-lg font-mono font-black tabular-nums" style={{ color: accentColor }}>
          {level}
        </span>
      </div>
      <div className="flex-1 flex flex-col gap-1">
        <div className="h-2 rounded-full bg-[var(--ce-gray-mid)] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: accentColor }}
            initial={{ width: 0 }}
            animate={{ width: `${prog.progress * 100}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between">
          <span className="text-[9px] text-[var(--ce-text-secondary)] tabular-nums font-mono">
            {xp.toLocaleString()} XP
          </span>
          {prog.needed > 0 && (
            <span className="text-[9px] text-[var(--ce-text-secondary)] tabular-nums font-mono">
              {prog.current} / {prog.needed}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SkillTreeGraph({
  category,
  unlockedSkillIds,
  agentXP,
}: {
  category: AgentCategory;
  unlockedSkillIds: string[];
  agentXP: number;
}) {
  const tree = getSkillTreeWithUnlocks(category, unlockedSkillIds);
  const tiers = [4, 3, 2, 1] as const;

  return (
    <div className="flex flex-col items-center gap-0">
      {tiers.map((tier, tierIdx) => {
        const nodesInTier = tree.nodes.filter((n) => n.tier === tier);
        if (nodesInTier.length === 0) return null;
        const isLast = tierIdx === tiers.length - 1;

        return (
          <div key={tier} className="flex flex-col items-center w-full">
            {nodesInTier.map((node) => (
              <SkillNodeRow key={node.id} node={node} agentXP={agentXP} />
            ))}
            {!isLast && <Connector unlocked={nodesInTier.every((n) => n.unlocked)} />}
          </div>
        );
      })}
    </div>
  );
}

function Connector({ unlocked }: { unlocked: boolean }) {
  return (
    <div className="flex flex-col items-center py-1">
      <div
        className="w-0.5 h-5 rounded-full"
        style={{
          backgroundColor: unlocked
            ? "rgba(127, 214, 66, 0.5)"
            : "rgba(127, 214, 66, 0.12)",
        }}
      />
      <div
        className="w-1.5 h-1.5 rounded-full -mt-0.5"
        style={{
          backgroundColor: unlocked
            ? "rgba(127, 214, 66, 0.6)"
            : "rgba(127, 214, 66, 0.15)",
        }}
      />
    </div>
  );
}

function SkillNodeRow({ node, agentXP }: { node: SkillNode; agentXP: number }) {
  const canUnlock = !node.unlocked && agentXP >= node.xpRequired;

  return (
    <motion.div
      className="flex items-center gap-3 w-full px-2 py-2 rounded-lg transition-colors"
      style={{
        backgroundColor: node.unlocked
          ? "rgba(127, 214, 66, 0.05)"
          : "transparent",
      }}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: (4 - node.tier) * 0.08 }}
    >
      {/* Tier label */}
      <span
        className="text-[9px] uppercase tracking-wider w-8 shrink-0 text-center"
        style={{ color: "var(--ce-text-secondary)", opacity: 0.4 }}
      >
        T{node.tier}
      </span>

      {/* Node circle */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-300"
        style={{
          backgroundColor: node.unlocked
            ? "rgba(127, 214, 66, 0.2)"
            : canUnlock
              ? "rgba(127, 214, 66, 0.08)"
              : "rgba(42, 42, 42, 0.6)",
          borderColor: node.unlocked
            ? "rgba(127, 214, 66, 0.8)"
            : canUnlock
              ? "rgba(127, 214, 66, 0.4)"
              : "rgba(58, 58, 58, 0.5)",
          boxShadow: node.unlocked
            ? "0 0 12px rgba(127, 214, 66, 0.4)"
            : "none",
        }}
      >
        {node.unlocked ? (
          <span className="text-sm" style={{ color: "#7FD642" }}>&#10003;</span>
        ) : (
          <span
            className="text-[10px] font-mono font-bold"
            style={{ color: canUnlock ? "#7FD642" : "#555" }}
          >
            {node.tier}
          </span>
        )}
      </div>

      {/* Node info */}
      <div className="flex-1 min-w-0">
        <div
          className="text-xs font-semibold truncate"
          style={{
            color: node.unlocked
              ? "var(--ce-text-primary)"
              : canUnlock
                ? "var(--ce-text-accent)"
                : "var(--ce-text-secondary)",
          }}
        >
          {node.name}
        </div>
        <div className="text-[10px] text-[var(--ce-text-secondary)] truncate">
          {node.description}
        </div>
      </div>

      {/* Status */}
      <div className="shrink-0 text-right">
        {node.unlocked ? (
          <span className="text-[9px] font-semibold" style={{ color: "#7FD642" }}>
            UNLOCKED
          </span>
        ) : (
          <span
            className="text-[9px] font-mono tabular-nums"
            style={{ color: canUnlock ? "#A3E635" : "#555" }}
          >
            {node.xpRequired.toLocaleString()} XP
          </span>
        )}
      </div>
    </motion.div>
  );
}
