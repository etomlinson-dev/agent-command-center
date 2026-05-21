import { create } from "zustand";
import type { AgentData, AgentCategory } from "@/app/types/agent";
import type { Building, GameEvent, Resources, ClaudeUsage } from "@/app/types/game";
import type { ExecutionPlan, CommandMessage, HandoffEvent } from "@/app/types/plan";
import type { FloatingXPEvent, TaskComplexity } from "@/app/types/gamification";
import type { RatchetResult, ActiveRatchetCycle } from "@/app/types/ratchet";
import { levelFromXP, calculateXPAward, healthFromStats } from "@/app/types/gamification";
import { getUnlockableSkills } from "./skill-trees";
import { CATEGORY_META } from "@/app/types/agent";
import { generateDummyAgents } from "./dummy-agents";
import { connectSSE, submitTask, submitSwarmTask } from "./sse-client";

export type BackendMode = "claude-code" | "api-key";

const BUILDING_LAYOUT: Record<AgentCategory, { position: [number, number, number]; size: [number, number, number] }> = {
  "core-dev":       { position: [0, 0, 0],       size: [4, 3, 4] },
  swarm:            { position: [-6, 0, -4.5],   size: [3, 2.5, 3] },
  consensus:        { position: [6, 0, -4.5],    size: [3.5, 2.5, 3.5] },
  github:           { position: [-9, 0, 3],      size: [4, 3.5, 4] },
  performance:      { position: [9, 0, 3],       size: [3, 2.5, 3] },
  security:         { position: [-4.5, 0, 7.5],  size: [3, 3, 3] },
  memory:           { position: [4.5, 0, 7.5],   size: [3, 2.5, 3] },
  browser:          { position: [-10, 0, -7.5],  size: [2.5, 2, 2.5] },
  release:          { position: [10, 0, -7.5],   size: [2.5, 2, 2.5] },
  training:         { position: [-7.5, 0, 10],   size: [2.5, 2, 2.5] },
  docs:             { position: [7.5, 0, 10],    size: [2.5, 2, 2.5] },
  architecture:     { position: [0, 0, -9],      size: [3, 2.5, 3] },
  communication:    { position: [-12, 0, 7.5],   size: [2.5, 2, 2.5] },
  data:             { position: [12, 0, 7.5],    size: [2.5, 2, 2.5] },
  infrastructure:   { position: [0, 0, 12],      size: [3, 2.5, 3] },
  specialized:      { position: [12, 0, -4.5],   size: [2, 1.5, 2] },
};

function buildBuildings(): Building[] {
  return (Object.entries(BUILDING_LAYOUT) as [AgentCategory, { position: [number, number, number]; size: [number, number, number] }][]).map(
    ([category, layout]) => ({
      id: `building-${category}`,
      name: CATEGORY_META[category].buildingName,
      category,
      position: layout.position,
      size: layout.size,
      agentCount: 0,
      isActive: false,
      glowIntensity: 0.3,
    })
  );
}

function buildingPositions(): Record<AgentCategory, [number, number, number]> {
  const result = {} as Record<AgentCategory, [number, number, number]>;
  for (const [cat, layout] of Object.entries(BUILDING_LAYOUT)) {
    result[cat as AgentCategory] = layout.position;
  }
  return result;
}

function buildingSizes(): Record<AgentCategory, [number, number, number]> {
  const result = {} as Record<AgentCategory, [number, number, number]>;
  for (const [cat, layout] of Object.entries(BUILDING_LAYOUT)) {
    result[cat as AgentCategory] = layout.size;
  }
  return result;
}


interface GameState {
  agents: AgentData[];
  buildings: Building[];
  events: GameEvent[];
  resources: Resources;
  selectedAgentId: string | null;
  selectedBuildingId: string | null;
  commandPaletteOpen: boolean;
  hoveredAgentId: string | null;
  connected: boolean;

  // Command dock state
  commandMessages: CommandMessage[];
  plans: ExecutionPlan[];
  previewPlanId: string | null;
  activeHandoffs: HandoffEvent[];

  // Gamification state
  floatingXPEvents: FloatingXPEvent[];
  skillTreeOpen: boolean;
  skillTreeAgentId: string | null;

  // Ratchet state
  ratchetHistory: RatchetResult[];
  activeCycles: ActiveRatchetCycle[];
  ratchetPanelOpen: boolean;
  ratchetPanelAgentId: string | null;

  // Backend mode
  backendMode: BackendMode;
  hasApiKey: boolean;
  settingsOpen: boolean;

  selectAgent: (id: string | null) => void;
  selectBuilding: (id: string | null) => void;
  setHoveredAgent: (id: string | null) => void;
  toggleCommandPalette: () => void;
  addEvent: (event: Omit<GameEvent, "id" | "timestamp">) => void;
  updateAgent: (id: string, update: Partial<AgentData>) => void;
  initFromSSE: (agents: AgentData[], plans: ExecutionPlan[], usage?: ClaudeUsage) => void;
  setConnected: (connected: boolean) => void;
  submitAgentTask: (agentId: string, prompt: string) => Promise<void>;
  submitSwarmTask: (prompt: string, category?: string) => Promise<void>;
  updateClaudeUsage: (usage: ClaudeUsage) => void;

  addCommandMessage: (msg: Omit<CommandMessage, "id" | "timestamp">) => void;
  submitCommand: (task: string) => Promise<void>;
  approvePlan: (planId: string) => Promise<void>;
  setPreviewPlan: (planId: string | null) => void;
  updatePlan: (plan: ExecutionPlan) => void;
  addHandoff: (handoff: HandoffEvent) => void;

  // Gamification actions
  awardXP: (agentId: string, complexity: TaskComplexity, isFirstToolUse?: boolean, isRatchetKept?: boolean) => void;
  unlockSkill: (agentId: string, skillId: string) => void;
  recalculateHealth: (agentId: string) => void;
  openSkillTree: (agentId: string) => void;
  closeSkillTree: () => void;
  removeFloatingXP: (id: string) => void;

  // Ratchet actions
  addRatchetResult: (result: RatchetResult) => void;
  setActiveCycle: (cycle: ActiveRatchetCycle) => void;
  removeActiveCycle: (id: string) => void;
  openRatchetPanel: (agentId: string | null) => void;
  closeRatchetPanel: () => void;

  // Backend mode actions
  setBackendMode: (mode: BackendMode, apiKey?: string) => Promise<void>;
  toggleSettings: () => void;
  fetchConfig: () => Promise<void>;
}

export const useGameStore = create<GameState>((set, get) => ({
  agents: generateDummyAgents(buildingPositions(), buildingSizes()),
  buildings: buildBuildings(),
  events: [],
  resources: {
    apiTokens: { used: 0, total: 100000 },
    taskQueue: 0,
    swarmHealth: 100,
    knowledgeNotes: 0,
    claude: {
      totalCostUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      totalSessions: 0,
      activeSessions: 0,
    },
  },
  selectedAgentId: null,
  selectedBuildingId: null,
  commandPaletteOpen: false,
  hoveredAgentId: null,
  connected: false,

  commandMessages: [],
  plans: [],
  previewPlanId: null,
  activeHandoffs: [],

  floatingXPEvents: [],
  skillTreeOpen: false,
  skillTreeAgentId: null,

  ratchetHistory: [],
  activeCycles: [],
  ratchetPanelOpen: false,
  ratchetPanelAgentId: null,

  backendMode: "claude-code",
  hasApiKey: false,
  settingsOpen: false,

  selectAgent: (id) => set({ selectedAgentId: id, selectedBuildingId: null }),
  selectBuilding: (id) => set({ selectedBuildingId: id, selectedAgentId: null }),
  setHoveredAgent: (id) => set({ hoveredAgentId: id }),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

  addEvent: (event) =>
    set((s) => ({
      events: [
        { ...event, id: `evt-${Date.now()}`, timestamp: Date.now() },
        ...s.events,
      ].slice(0, 50),
    })),

  updateAgent: (id, update) =>
    set((s) => ({
      agents: s.agents.map((a) =>
        a.id === id ? { ...a, ...update } : a
      ),
    })),

  initFromSSE: (agents, plans, usage) =>
    set((s) => ({
      agents,
      plans,
      connected: true,
      resources: usage ? { ...s.resources, claude: usage } : s.resources,
    })),

  setConnected: (connected) => set({ connected }),

  submitAgentTask: async (agentId, prompt) => {
    try {
      await submitTask(agentId, prompt);
    } catch {
      get().addEvent({
        type: "agent_error",
        agentId,
        message: `Failed to submit task to ${agentId}`,
        category: null,
      });
    }
  },

  submitSwarmTask: async (prompt, category) => {
    try {
      await submitSwarmTask(prompt, category);
      get().addEvent({
        type: "task_start",
        agentId: null,
        message: `Task submitted to swarm: ${prompt.slice(0, 60)}`,
        category: null,
      });
    } catch {
      get().addEvent({
        type: "agent_error",
        agentId: null,
        message: "Failed to submit task to swarm",
        category: null,
      });
    }
  },

  updateClaudeUsage: (usage) =>
    set((s) => ({
      resources: { ...s.resources, claude: usage },
    })),

  addCommandMessage: (msg) =>
    set((s) => ({
      commandMessages: [
        ...s.commandMessages,
        { ...msg, id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, timestamp: Date.now() },
      ],
    })),

  submitCommand: async (task) => {
    get().addCommandMessage({ role: "user", content: task });
    get().addCommandMessage({ role: "system", content: "Planning..." });

    try {
      const res = await fetch("/api/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      const plan = data.plan as ExecutionPlan;
      set((s) => ({
        plans: [...s.plans, plan],
        previewPlanId: plan.id,
        commandMessages: s.commandMessages
          .filter((m) => m.content !== "Planning...")
          .concat({
            id: `cmd-${Date.now()}`,
            role: "orchestrator",
            content: plan.summary,
            timestamp: Date.now(),
            planId: plan.id,
          }),
      }));
    } catch (err) {
      set((s) => ({
        commandMessages: s.commandMessages
          .filter((m) => m.content !== "Planning...")
          .concat({
            id: `cmd-${Date.now()}`,
            role: "system",
            content: `Error: ${err instanceof Error ? err.message : String(err)}`,
            timestamp: Date.now(),
          }),
      }));
    }
  },

  approvePlan: async (planId) => {
    try {
      const res = await fetch("/api/command/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      const plan = data.plan as ExecutionPlan;
      set((s) => ({
        plans: s.plans.map((p) => (p.id === planId ? plan : p)),
        previewPlanId: null,
      }));
      get().addCommandMessage({ role: "system", content: `Plan approved — ${plan.agents.length} agents dispatched` });
      get().addEvent({
        type: "task_start",
        agentId: null,
        message: `Swarm executing: ${plan.summary.slice(0, 60)}`,
        category: null,
      });
    } catch (err) {
      get().addCommandMessage({
        role: "system",
        content: `Approval failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  },

  setPreviewPlan: (planId) => set({ previewPlanId: planId }),

  updatePlan: (plan) =>
    set((s) => ({
      plans: s.plans.map((p) => (p.id === plan.id ? plan : p)),
    })),

  addHandoff: (handoff) =>
    set((s) => {
      const handoffs = [...s.activeHandoffs, handoff];
      setTimeout(() => {
        useGameStore.setState((prev) => ({
          activeHandoffs: prev.activeHandoffs.filter((h) => h.id !== handoff.id),
        }));
      }, 8000);
      return { activeHandoffs: handoffs };
    }),

  // --- Gamification actions ---

  awardXP: (agentId, complexity, isFirstToolUse = false, isRatchetKept = false) => {
    const state = get();
    const agent = state.agents.find((a) => a.id === agentId);
    if (!agent) return;

    const award = calculateXPAward(complexity, isFirstToolUse, isRatchetKept);
    const newXP = agent.xp + award.total;
    const oldLevel = agent.level;
    const newLevel = levelFromXP(newXP);

    const floatingXP: FloatingXPEvent = {
      id: `xp-${Date.now()}-${agentId}`,
      agentId,
      amount: award.total,
      position: [...agent.position] as [number, number, number],
      timestamp: Date.now(),
      bonus: award.bonuses.length > 0 ? award.bonuses.map((b) => b.label).join(", ") : undefined,
    };

    const updates: Partial<AgentData> = { xp: newXP, level: newLevel };

    // Auto-unlock available skills on XP gain
    const unlockable = getUnlockableSkills(agent.category, newXP, agent.skills);
    if (unlockable.length > 0) {
      updates.skills = [...agent.skills, ...unlockable.map((s) => s.id)];
      for (const skill of unlockable) {
        state.addEvent({
          type: "skill_unlock",
          agentId,
          message: `${agent.name} unlocked: ${skill.name}`,
          category: agent.category,
        });
      }
    }

    state.updateAgent(agentId, updates);

    set((s) => ({
      floatingXPEvents: [...s.floatingXPEvents, floatingXP],
    }));

    // Auto-remove floating XP after 2 seconds
    setTimeout(() => {
      useGameStore.getState().removeFloatingXP(floatingXP.id);
    }, 2000);

    state.addEvent({
      type: "xp_gain",
      agentId,
      message: `${agent.name} +${award.total} XP${award.bonuses.length > 0 ? ` (${award.bonuses.map((b) => b.label).join(", ")})` : ""}`,
      category: agent.category,
    });

    if (newLevel > oldLevel) {
      state.updateAgent(agentId, { status: "evolving" });
      state.addEvent({
        type: "level_up",
        agentId,
        message: `${agent.name} reached Level ${newLevel}!`,
        category: agent.category,
      });
      // Return to idle after evolution animation
      setTimeout(() => {
        const current = useGameStore.getState().agents.find((a) => a.id === agentId);
        if (current?.status === "evolving") {
          useGameStore.getState().updateAgent(agentId, { status: "idle" });
        }
      }, 3000);
    }
  },

  unlockSkill: (agentId, skillId) => {
    const state = get();
    const agent = state.agents.find((a) => a.id === agentId);
    if (!agent || agent.skills.includes(skillId)) return;

    state.updateAgent(agentId, { skills: [...agent.skills, skillId] });
    state.addEvent({
      type: "skill_unlock",
      agentId,
      message: `${agent.name} unlocked skill: ${skillId}`,
      category: agent.category,
    });
  },

  recalculateHealth: (agentId) => {
    const agent = get().agents.find((a) => a.id === agentId);
    if (!agent) return;
    const health = healthFromStats(agent.stats);
    get().updateAgent(agentId, { health });
  },

  openSkillTree: (agentId) => set({ skillTreeOpen: true, skillTreeAgentId: agentId }),
  closeSkillTree: () => set({ skillTreeOpen: false, skillTreeAgentId: null }),

  removeFloatingXP: (id) =>
    set((s) => ({
      floatingXPEvents: s.floatingXPEvents.filter((e) => e.id !== id),
    })),

  // --- Ratchet actions ---

  addRatchetResult: (result) =>
    set((s) => ({
      ratchetHistory: [result, ...s.ratchetHistory].slice(0, 100),
      activeCycles: s.activeCycles.filter((c) => c.agentId !== result.agentId),
    })),

  setActiveCycle: (cycle) =>
    set((s) => ({
      activeCycles: [
        ...s.activeCycles.filter((c) => c.id !== cycle.id),
        cycle,
      ],
    })),

  removeActiveCycle: (id) =>
    set((s) => ({
      activeCycles: s.activeCycles.filter((c) => c.id !== id),
    })),

  openRatchetPanel: (agentId) => set({ ratchetPanelOpen: true, ratchetPanelAgentId: agentId }),
  closeRatchetPanel: () => set({ ratchetPanelOpen: false, ratchetPanelAgentId: null }),

  // --- Backend mode actions ---

  setBackendMode: async (mode, apiKey) => {
    try {
      const body: Record<string, string> = { backendMode: mode };
      if (apiKey !== undefined) body.apiKey = apiKey;
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      set({ backendMode: data.backendMode, hasApiKey: data.hasApiKey });
      get().addEvent({
        type: "system",
        agentId: null,
        message: `Backend switched to ${data.backendMode === "api-key" ? "API Key" : "Claude Code"} mode`,
        category: null,
      });
    } catch {
      get().addEvent({
        type: "agent_error",
        agentId: null,
        message: "Failed to update backend mode",
        category: null,
      });
    }
  },

  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),

  fetchConfig: async () => {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      set({ backendMode: data.backendMode, hasApiKey: data.hasApiKey });
    } catch { /* ignore */ }
  },
}));

// SSE connection — auto-connect on module load (client only)
if (typeof window !== "undefined") {
  useGameStore.getState().fetchConfig();

  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function connect() {
    connectSSE({
      onInit: (agents, plans, usage) => {
        useGameStore.getState().initFromSSE(agents, plans, usage);
      },
      onAgentUpdate: (agentId, update) => {
        useGameStore.getState().updateAgent(agentId, update);
      },
      onEvent: (event) => {
        const eventType = event.type as GameEvent["type"];
        useGameStore.getState().addEvent({
          type: eventType,
          agentId: event.agentId ?? null,
          message: event.message,
          category: null,
        });
      },
      onPlanUpdate: (plan) => {
        useGameStore.getState().updatePlan(plan);
      },
      onHandoff: (handoff) => {
        useGameStore.getState().addHandoff(handoff);
        useGameStore.getState().addEvent({
          type: "communication",
          agentId: handoff.sourceAgentId,
          message: `${handoff.sourceAgentName} → ${handoff.targetAgentName}: ${handoff.data.slice(0, 60)}`,
          category: null,
        });
      },
      onRatchet: (event) => {
        const store = useGameStore.getState();
        const eventType = event.type as "ratchet_start" | "ratchet_kept" | "ratchet_reverted" | "ratchet_skipped";
        store.addEvent({
          type: eventType,
          agentId: event.agentId,
          message: event.message,
          category: null,
        });

        if (event.result) {
          store.addRatchetResult(event.result);

          if (event.result.verdict === "kept" && event.result.xpAwarded > 0) {
            store.awardXP(event.agentId, event.result.evaluation.complexity, false, true);
          }
        }
      },
      onUsage: (usageData) => {
        useGameStore.getState().updateClaudeUsage(usageData);
      },
      onError: () => {
        useGameStore.getState().setConnected(false);
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connect, 5000);
      },
    });
  }

  connect();
}
