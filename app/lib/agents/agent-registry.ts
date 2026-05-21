import type { AgentData, AgentCategory } from "@/app/types/agent";
import type { AgentTask } from "@/app/types/task";
import { CATEGORY_META } from "@/app/types/agent";

export interface AgentProfile {
  allowedTools: string[];
  permissionMode: string;
  maxTurns?: number;
  maxBudgetUsd?: number;
}

export interface LiveAgent {
  data: AgentData;
  isReal: boolean;
  sessionId: string | null;
  currentTaskData: AgentTask | null;
  profile: AgentProfile;
}

const ROLE_PROFILES: Record<string, AgentProfile> = {
  coder: {
    allowedTools: ["Read", "Edit", "Write", "Bash", "Glob", "Grep"],
    permissionMode: "acceptEdits",
    maxTurns: 20,
    maxBudgetUsd: 2.0,
  },
  planner: {
    allowedTools: ["Read", "Glob", "Grep", "Bash"],
    permissionMode: "default",
    maxTurns: 10,
  },
  researcher: {
    allowedTools: ["Read", "Glob", "Grep", "WebSearch", "WebFetch"],
    permissionMode: "default",
    maxTurns: 15,
  },
  reviewer: {
    allowedTools: ["Read", "Glob", "Grep"],
    permissionMode: "default",
    maxTurns: 10,
  },
  tester: {
    allowedTools: ["Read", "Bash", "Glob", "Edit", "Write"],
    permissionMode: "acceptEdits",
    maxTurns: 15,
  },
};

const CATEGORY_PROFILES: Record<AgentCategory, AgentProfile> = {
  "core-dev": {
    allowedTools: ["Read", "Edit", "Write", "Bash", "Glob", "Grep"],
    permissionMode: "acceptEdits",
    maxTurns: 20,
    maxBudgetUsd: 2.0,
  },
  swarm: {
    allowedTools: ["Read", "Glob", "Grep", "Bash"],
    permissionMode: "default",
    maxTurns: 15,
  },
  consensus: {
    allowedTools: ["Read", "Glob", "Grep"],
    permissionMode: "default",
    maxTurns: 10,
  },
  github: {
    allowedTools: ["Read", "Glob", "Grep", "Bash"],
    permissionMode: "default",
    maxTurns: 15,
    maxBudgetUsd: 1.5,
  },
  performance: {
    allowedTools: ["Read", "Bash", "Glob", "Grep"],
    permissionMode: "default",
    maxTurns: 15,
  },
  security: {
    allowedTools: ["Read", "Bash", "Grep", "Glob", "WebFetch"],
    permissionMode: "default",
    maxTurns: 15,
  },
  memory: {
    allowedTools: ["Read", "Write", "Glob", "Grep", "WebSearch", "WebFetch"],
    permissionMode: "acceptEdits",
    maxTurns: 15,
  },
  browser: {
    allowedTools: ["Read", "Bash", "WebFetch", "WebSearch"],
    permissionMode: "default",
    maxTurns: 20,
    maxBudgetUsd: 1.5,
  },
  release: {
    allowedTools: ["Read", "Bash", "Glob", "Grep", "Edit"],
    permissionMode: "acceptEdits",
    maxTurns: 15,
  },
  training: {
    allowedTools: ["Read", "Bash", "Write", "Glob"],
    permissionMode: "acceptEdits",
    maxTurns: 20,
    maxBudgetUsd: 2.0,
  },
  docs: {
    allowedTools: ["Read", "Write", "Edit", "Glob", "Grep"],
    permissionMode: "acceptEdits",
    maxTurns: 15,
  },
  architecture: {
    allowedTools: ["Read", "Glob", "Grep", "Write"],
    permissionMode: "default",
    maxTurns: 15,
  },
  communication: {
    allowedTools: ["Read", "Glob", "Grep", "Bash"],
    permissionMode: "default",
    maxTurns: 10,
  },
  data: {
    allowedTools: ["Read", "Bash", "Glob", "Grep", "Write"],
    permissionMode: "acceptEdits",
    maxTurns: 20,
  },
  infrastructure: {
    allowedTools: ["Read", "Bash", "Glob", "Grep"],
    permissionMode: "default",
    maxTurns: 15,
  },
  specialized: {
    allowedTools: ["Read", "Edit", "Write", "Bash", "Glob", "Grep", "WebSearch", "WebFetch"],
    permissionMode: "acceptEdits",
    maxTurns: 20,
    maxBudgetUsd: 2.0,
  },
};

interface AgentDef {
  name: string;
  role: string;
  category: AgentCategory;
}

const AGENT_DEFS: AgentDef[] = [
  { name: "Coder-1", role: "coder", category: "core-dev" },
  { name: "Planner", role: "planner", category: "core-dev" },
  { name: "Researcher", role: "researcher", category: "core-dev" },
  { name: "Reviewer-1", role: "reviewer", category: "core-dev" },
  { name: "Tester-1", role: "tester", category: "core-dev" },
  { name: "Hierarchical-Coord", role: "coordinator", category: "swarm" },
  { name: "Mesh-Coord", role: "coordinator", category: "swarm" },
  { name: "Adaptive-Coord", role: "coordinator", category: "swarm" },
  { name: "Byzantine-1", role: "consensus", category: "consensus" },
  { name: "Byzantine-2", role: "consensus", category: "consensus" },
  { name: "Raft-Leader", role: "consensus", category: "consensus" },
  { name: "Raft-Follower-1", role: "consensus", category: "consensus" },
  { name: "Raft-Follower-2", role: "consensus", category: "consensus" },
  { name: "Gossip-Node", role: "consensus", category: "consensus" },
  { name: "CRDT-Merge", role: "consensus", category: "consensus" },
  { name: "PR-Manager", role: "pr", category: "github" },
  { name: "Code-Reviewer-1", role: "reviewer", category: "github" },
  { name: "Code-Reviewer-2", role: "reviewer", category: "github" },
  { name: "Code-Reviewer-3", role: "reviewer", category: "github" },
  { name: "Release-Auto", role: "release", category: "github" },
  { name: "Branch-Guard", role: "guard", category: "github" },
  { name: "Issue-Triage", role: "triage", category: "github" },
  { name: "Merge-Bot", role: "merge", category: "github" },
  { name: "CI-Watcher", role: "ci", category: "github" },
  { name: "Dep-Updater", role: "deps", category: "github" },
  { name: "Label-Bot", role: "labels", category: "github" },
  { name: "Changelog-Gen", role: "changelog", category: "github" },
  { name: "Stale-Closer", role: "stale", category: "github" },
  { name: "Perf-Monitor", role: "monitor", category: "performance" },
  { name: "Load-Balancer", role: "balancer", category: "performance" },
  { name: "Profiler", role: "profiler", category: "performance" },
  { name: "Cache-Opt", role: "cache", category: "performance" },
  { name: "Query-Opt", role: "query", category: "performance" },
  { name: "Topology-Opt", role: "topology", category: "performance" },
  { name: "Vuln-Scanner", role: "scanner", category: "security" },
  { name: "Auth-Verifier", role: "verifier", category: "security" },
  { name: "Audit-Logger", role: "audit", category: "security" },
  { name: "Pen-Tester", role: "pentest", category: "security" },
  { name: "Knowledge-Retriever", role: "retriever", category: "memory" },
  { name: "Context-Manager", role: "context", category: "memory" },
  { name: "Embedding-Agent", role: "embedding", category: "memory" },
  { name: "Graph-Walker", role: "graph", category: "memory" },
  { name: "Web-Scraper", role: "scraper", category: "browser" },
  { name: "Form-Filler", role: "form", category: "browser" },
  { name: "Screenshot-Agent", role: "screenshot", category: "browser" },
  { name: "Deploy-Bot", role: "deploy", category: "release" },
  { name: "Version-Bump", role: "version", category: "release" },
  { name: "Rollback-Agent", role: "rollback", category: "release" },
  { name: "Model-Eval", role: "eval", category: "training" },
  { name: "Pipeline-Runner", role: "pipeline", category: "training" },
  { name: "Doc-Gen", role: "generator", category: "docs" },
  { name: "API-Documenter", role: "api-docs", category: "docs" },
  { name: "Readme-Writer", role: "readme", category: "docs" },
  { name: "System-Designer", role: "designer", category: "architecture" },
  { name: "Infra-Planner", role: "planner", category: "architecture" },
  { name: "Notifier", role: "notify", category: "communication" },
  { name: "Handoff-Agent", role: "handoff", category: "communication" },
  { name: "Standup-Bot", role: "standup", category: "communication" },
  { name: "ETL-Runner", role: "etl", category: "data" },
  { name: "Report-Gen", role: "report", category: "data" },
  { name: "Anomaly-Detect", role: "anomaly", category: "data" },
  { name: "VM-Manager", role: "vm", category: "infrastructure" },
  { name: "Network-Agent", role: "network", category: "infrastructure" },
  { name: "Wildcard", role: "special", category: "specialized" },
];

const BUILDING_LAYOUT: Record<AgentCategory, { position: [number, number, number]; size: [number, number, number] }> = {
  "core-dev":       { position: [0, 0, 0],      size: [4, 3, 4] },
  swarm:            { position: [-8, 0, -6],     size: [3, 2.5, 3] },
  consensus:        { position: [8, 0, -6],      size: [3.5, 2.5, 3.5] },
  github:           { position: [-12, 0, 4],     size: [4, 3.5, 4] },
  performance:      { position: [12, 0, 4],      size: [3, 2.5, 3] },
  security:         { position: [-6, 0, 10],     size: [3, 3, 3] },
  memory:           { position: [6, 0, 10],      size: [3, 2.5, 3] },
  browser:          { position: [-14, 0, -10],   size: [2.5, 2, 2.5] },
  release:          { position: [14, 0, -10],    size: [2.5, 2, 2.5] },
  training:         { position: [-10, 0, 14],    size: [2.5, 2, 2.5] },
  docs:             { position: [10, 0, 14],     size: [2.5, 2, 2.5] },
  architecture:     { position: [0, 0, -12],     size: [3, 2.5, 3] },
  communication:    { position: [-16, 0, 10],    size: [2.5, 2, 2.5] },
  data:             { position: [16, 0, 10],     size: [2.5, 2, 2.5] },
  infrastructure:   { position: [0, 0, 16],      size: [3, 2.5, 3] },
  specialized:      { position: [16, 0, -6],     size: [2, 1.5, 2] },
};

export type AgentStateListener = (agentId: string, update: Partial<AgentData>) => void;

class AgentRegistry {
  private agents: Map<string, LiveAgent> = new Map();
  private listeners: Set<AgentStateListener> = new Set();

  constructor() {
    this.initializeAgents();
  }

  private initializeAgents() {
    AGENT_DEFS.forEach((def, i) => {
      const meta = CATEGORY_META[def.category];
      const layout = BUILDING_LAYOUT[def.category];
      const angle = (i * 137.5 * Math.PI) / 180;
      const minRadius = Math.max(layout.size[0], layout.size[2]) / 2 + 1;
      const radius = minRadius + Math.random() * 2;

      const roleProfile = ROLE_PROFILES[def.role];
      const categoryProfile = CATEGORY_PROFILES[def.category];
      const profile: AgentProfile = roleProfile
        ? { ...categoryProfile, ...roleProfile, allowedTools: [...new Set([...categoryProfile.allowedTools, ...roleProfile.allowedTools])] }
        : categoryProfile;

      const data: AgentData = {
        id: `agent-${i}`,
        name: def.name,
        role: def.role,
        category: def.category,
        status: "idle",
        position: [
          layout.position[0] + Math.cos(angle) * radius,
          0,
          layout.position[2] + Math.sin(angle) * radius,
        ],
        targetPosition: null,
        health: 100,
        xp: 0,
        level: 1,
        currentTask: null,
        accentColor: meta.color,
        icon: meta.icon,
        skills: [],
        stats: {
          tasksCompleted: 0,
          tasksFailed: 0,
          totalIterations: 0,
          avgIterations: 0,
          ratchetImprovements: 0,
          ratchetReverts: 0,
          firstToolUses: [],
        },
      };

      this.agents.set(data.id, {
        data,
        isReal: false,
        sessionId: null,
        currentTaskData: null,
        profile,
      });
    });
  }

  getAgent(id: string): LiveAgent | undefined {
    return this.agents.get(id);
  }

  getAllAgents(): LiveAgent[] {
    return Array.from(this.agents.values());
  }

  getAllAgentData(): AgentData[] {
    return this.getAllAgents().map((a) => a.data);
  }

  findByName(name: string): LiveAgent | undefined {
    return this.getAllAgents().find((a) => a.data.name === name);
  }

  updateAgent(id: string, update: Partial<AgentData>) {
    const agent = this.agents.get(id);
    if (!agent) return;
    Object.assign(agent.data, update);
    this.notifyListeners(id, update);
  }

  markReal(id: string, sessionId: string) {
    const agent = this.agents.get(id);
    if (!agent) return;
    agent.isReal = true;
    agent.sessionId = sessionId;
  }

  setTask(id: string, task: AgentTask | null) {
    const agent = this.agents.get(id);
    if (!agent) return;
    agent.currentTaskData = task;
    const update: Partial<AgentData> = {
      currentTask: task ? task.prompt.slice(0, 60) : null,
    };
    if (task?.status === "running") {
      update.status = "working";
    } else if (!task && agent.data.status === "working") {
      update.status = "idle";
    }
    this.updateAgent(id, update);
  }

  onStateChange(listener: AgentStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(agentId: string, update: Partial<AgentData>) {
    for (const listener of this.listeners) {
      try {
        listener(agentId, update);
      } catch {
        this.listeners.delete(listener);
      }
    }
  }
}

let registryInstance: AgentRegistry | null = null;

export function getRegistry(): AgentRegistry {
  if (!registryInstance) {
    registryInstance = new AgentRegistry();
  }
  return registryInstance;
}
