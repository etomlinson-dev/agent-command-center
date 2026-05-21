import type { AgentData, AgentCategory } from "@/app/types/agent";
import { CATEGORY_META } from "@/app/types/agent";

interface AgentDef {
  name: string;
  role: string;
  category: AgentCategory;
}

const AGENT_DEFS: AgentDef[] = [
  // Core Development (5)
  { name: "Coder-1", role: "coder", category: "core-dev" },
  { name: "Planner", role: "planner", category: "core-dev" },
  { name: "Researcher", role: "researcher", category: "core-dev" },
  { name: "Reviewer-1", role: "reviewer", category: "core-dev" },
  { name: "Tester-1", role: "tester", category: "core-dev" },
  // Swarm Coordination (3)
  { name: "Hierarchical-Coord", role: "coordinator", category: "swarm" },
  { name: "Mesh-Coord", role: "coordinator", category: "swarm" },
  { name: "Adaptive-Coord", role: "coordinator", category: "swarm" },
  // Consensus (7)
  { name: "Byzantine-1", role: "consensus", category: "consensus" },
  { name: "Byzantine-2", role: "consensus", category: "consensus" },
  { name: "Raft-Leader", role: "consensus", category: "consensus" },
  { name: "Raft-Follower-1", role: "consensus", category: "consensus" },
  { name: "Raft-Follower-2", role: "consensus", category: "consensus" },
  { name: "Gossip-Node", role: "consensus", category: "consensus" },
  { name: "CRDT-Merge", role: "consensus", category: "consensus" },
  // GitHub (13)
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
  // Performance (6)
  { name: "Perf-Monitor", role: "monitor", category: "performance" },
  { name: "Load-Balancer", role: "balancer", category: "performance" },
  { name: "Profiler", role: "profiler", category: "performance" },
  { name: "Cache-Opt", role: "cache", category: "performance" },
  { name: "Query-Opt", role: "query", category: "performance" },
  { name: "Topology-Opt", role: "topology", category: "performance" },
  // Security (4)
  { name: "Vuln-Scanner", role: "scanner", category: "security" },
  { name: "Auth-Verifier", role: "verifier", category: "security" },
  { name: "Audit-Logger", role: "audit", category: "security" },
  { name: "Pen-Tester", role: "pentest", category: "security" },
  // Memory (4)
  { name: "Knowledge-Retriever", role: "retriever", category: "memory" },
  { name: "Context-Manager", role: "context", category: "memory" },
  { name: "Embedding-Agent", role: "embedding", category: "memory" },
  { name: "Graph-Walker", role: "graph", category: "memory" },
  // Browser (3)
  { name: "Web-Scraper", role: "scraper", category: "browser" },
  { name: "Form-Filler", role: "form", category: "browser" },
  { name: "Screenshot-Agent", role: "screenshot", category: "browser" },
  // Release (3)
  { name: "Deploy-Bot", role: "deploy", category: "release" },
  { name: "Version-Bump", role: "version", category: "release" },
  { name: "Rollback-Agent", role: "rollback", category: "release" },
  // Training (2)
  { name: "Model-Eval", role: "eval", category: "training" },
  { name: "Pipeline-Runner", role: "pipeline", category: "training" },
  // Docs (3)
  { name: "Doc-Gen", role: "generator", category: "docs" },
  { name: "API-Documenter", role: "api-docs", category: "docs" },
  { name: "Readme-Writer", role: "readme", category: "docs" },
  // Architecture (2)
  { name: "System-Designer", role: "designer", category: "architecture" },
  { name: "Infra-Planner", role: "planner", category: "architecture" },
  // Communication (3)
  { name: "Notifier", role: "notify", category: "communication" },
  { name: "Handoff-Agent", role: "handoff", category: "communication" },
  { name: "Standup-Bot", role: "standup", category: "communication" },
  // Data (3)
  { name: "ETL-Runner", role: "etl", category: "data" },
  { name: "Report-Gen", role: "report", category: "data" },
  { name: "Anomaly-Detect", role: "anomaly", category: "data" },
  // Infrastructure (2)
  { name: "VM-Manager", role: "vm", category: "infrastructure" },
  { name: "Network-Agent", role: "network", category: "infrastructure" },
  // Specialized (1)
  { name: "Wildcard", role: "special", category: "specialized" },
];

export function generateDummyAgents(
  buildingPositions: Record<AgentCategory, [number, number, number]>,
  buildingSizes: Record<AgentCategory, [number, number, number]>,
): AgentData[] {
  return AGENT_DEFS.map((def, i) => {
    const meta = CATEGORY_META[def.category];
    const buildingPos = buildingPositions[def.category];
    const buildingSize = buildingSizes[def.category];
    const angle = (i * 137.5 * Math.PI) / 180;
    const minRadius = Math.max(buildingSize[0], buildingSize[2]) / 2 + 1;
    const radius = minRadius + Math.random() * 1.5;

    return {
      id: `agent-${i}`,
      name: def.name,
      role: def.role,
      category: def.category,
      status: "idle" as const,
      position: [
        buildingPos[0] + Math.cos(angle) * radius,
        0,
        buildingPos[2] + Math.sin(angle) * radius,
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
  });
}
