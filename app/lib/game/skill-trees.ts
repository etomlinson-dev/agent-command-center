import type { AgentCategory } from "@/app/types/agent";
import type { SkillTree, SkillNode } from "@/app/types/gamification";

function node(
  id: string,
  name: string,
  description: string,
  tier: 1 | 2 | 3 | 4,
  xpRequired: number,
  prerequisiteIds: string[],
  icon: string,
): SkillNode {
  return { id, name, description, tier, xpRequired, prerequisiteIds, unlocked: false, icon };
}

const SKILL_TREES: Record<AgentCategory, Omit<SkillTree, "category">> = {
  "core-dev": {
    label: "Development Mastery",
    nodes: [
      node("cd-1", "Refactoring", "Clean up existing code patterns", 1, 0, [], "wrench"),
      node("cd-2", "Multi-file", "Coordinate changes across files", 2, 250, ["cd-1"], "files"),
      node("cd-3", "Architecture", "Design system-level structures", 3, 1000, ["cd-2"], "blueprint"),
      node("cd-4", "Self-Modifying", "Rewrite own prompts and tools", 4, 4000, ["cd-3"], "dna"),
    ],
  },
  swarm: {
    label: "Coordination Mastery",
    nodes: [
      node("sw-1", "Task Routing", "Route tasks to correct agents", 1, 0, [], "route"),
      node("sw-2", "Load Balancing", "Distribute work evenly", 2, 250, ["sw-1"], "balance"),
      node("sw-3", "Adaptive Strategy", "Switch strategies mid-execution", 3, 1000, ["sw-2"], "brain"),
      node("sw-4", "Swarm Intelligence", "Emergent multi-agent behaviors", 4, 4000, ["sw-3"], "network"),
    ],
  },
  consensus: {
    label: "Agreement Protocols",
    nodes: [
      node("cn-1", "Simple Vote", "Basic majority consensus", 1, 0, [], "vote"),
      node("cn-2", "Conflict Resolution", "Resolve agent disagreements", 2, 250, ["cn-1"], "handshake"),
      node("cn-3", "Byzantine Tolerance", "Handle malicious/faulty agents", 3, 1000, ["cn-2"], "shield"),
      node("cn-4", "Instant Consensus", "Near-zero-latency agreement", 4, 4000, ["cn-3"], "lightning"),
    ],
  },
  github: {
    label: "Git Mastery",
    nodes: [
      node("gh-1", "PR Review", "Review pull requests", 1, 0, [], "eye"),
      node("gh-2", "Multi-repo", "Operate across repositories", 2, 250, ["gh-1"], "repos"),
      node("gh-3", "CI Mastery", "Design and fix CI pipelines", 3, 1000, ["gh-2"], "pipeline"),
      node("gh-4", "Release Captain", "Orchestrate full release cycles", 4, 4000, ["gh-3"], "rocket"),
    ],
  },
  performance: {
    label: "Optimization Path",
    nodes: [
      node("pf-1", "Profiling", "Identify bottlenecks", 1, 0, [], "gauge"),
      node("pf-2", "Caching", "Implement caching strategies", 2, 250, ["pf-1"], "cache"),
      node("pf-3", "Query Tuning", "Optimize database queries", 3, 1000, ["pf-2"], "database"),
      node("pf-4", "Zero-overhead", "Eliminate all measurable waste", 4, 4000, ["pf-3"], "lightning"),
    ],
  },
  security: {
    label: "Security Clearance",
    nodes: [
      node("sc-1", "Scanning", "Run vulnerability scans", 1, 0, [], "scan"),
      node("sc-2", "Pen Testing", "Active penetration testing", 2, 250, ["sc-1"], "target"),
      node("sc-3", "Audit Trail", "Full audit logging and compliance", 3, 1000, ["sc-2"], "audit"),
      node("sc-4", "Zero-Day Hunter", "Discover unknown vulnerabilities", 4, 4000, ["sc-3"], "skull"),
    ],
  },
  memory: {
    label: "Knowledge Mastery",
    nodes: [
      node("mm-1", "Retrieval", "Search and recall knowledge", 1, 0, [], "search"),
      node("mm-2", "Embedding", "Create semantic embeddings", 2, 250, ["mm-1"], "vector"),
      node("mm-3", "Graph Walking", "Traverse knowledge graphs", 3, 1000, ["mm-2"], "graph"),
      node("mm-4", "Omniscience", "Instant recall across all sources", 4, 4000, ["mm-3"], "eye"),
    ],
  },
  browser: {
    label: "Web Mastery",
    nodes: [
      node("br-1", "Page Reading", "Extract content from pages", 1, 0, [], "page"),
      node("br-2", "Form Automation", "Fill and submit forms", 2, 250, ["br-1"], "form"),
      node("br-3", "SPA Navigation", "Handle complex JS-rendered sites", 3, 1000, ["br-2"], "code"),
      node("br-4", "Stealth Mode", "Bypass bot detection", 4, 4000, ["br-3"], "ghost"),
    ],
  },
  release: {
    label: "Deployment Mastery",
    nodes: [
      node("rl-1", "Version Bump", "Manage semantic versioning", 1, 0, [], "tag"),
      node("rl-2", "Staged Deploy", "Progressive rollout strategies", 2, 250, ["rl-1"], "layers"),
      node("rl-3", "Canary Release", "Traffic-split canary deployments", 3, 1000, ["rl-2"], "bird"),
      node("rl-4", "Zero Downtime", "Guaranteed zero-downtime deploys", 4, 4000, ["rl-3"], "infinity"),
    ],
  },
  training: {
    label: "ML Pipeline",
    nodes: [
      node("tr-1", "Data Prep", "Clean and prepare training data", 1, 0, [], "data"),
      node("tr-2", "Model Eval", "Evaluate model performance", 2, 250, ["tr-1"], "chart"),
      node("tr-3", "Hypertuning", "Automated hyperparameter search", 3, 1000, ["tr-2"], "tune"),
      node("tr-4", "Self-Training", "Train on own performance data", 4, 4000, ["tr-3"], "loop"),
    ],
  },
  docs: {
    label: "Documentation Path",
    nodes: [
      node("dc-1", "API Docs", "Generate API documentation", 1, 0, [], "scroll"),
      node("dc-2", "Tutorials", "Write step-by-step guides", 2, 250, ["dc-1"], "book"),
      node("dc-3", "Architecture Docs", "Document system architecture", 3, 1000, ["dc-2"], "blueprint"),
      node("dc-4", "Self-Documenting", "Auto-generate docs from code changes", 4, 4000, ["dc-3"], "magic"),
    ],
  },
  architecture: {
    label: "Design Mastery",
    nodes: [
      node("ar-1", "Component Design", "Design individual components", 1, 0, [], "box"),
      node("ar-2", "System Design", "Design system interactions", 2, 250, ["ar-1"], "grid"),
      node("ar-3", "Distributed Systems", "Design distributed architectures", 3, 1000, ["ar-2"], "cloud"),
      node("ar-4", "Self-Evolving", "Architecture that adapts automatically", 4, 4000, ["ar-3"], "dna"),
    ],
  },
  communication: {
    label: "Communication Path",
    nodes: [
      node("cm-1", "Notifications", "Send targeted alerts", 1, 0, [], "bell"),
      node("cm-2", "Multi-channel", "Coordinate across Slack/email/GitHub", 2, 250, ["cm-1"], "channels"),
      node("cm-3", "Context Handoff", "Rich context transfer between agents", 3, 1000, ["cm-2"], "handoff"),
      node("cm-4", "Telepathy", "Zero-latency agent-to-agent comms", 4, 4000, ["cm-3"], "brain"),
    ],
  },
  data: {
    label: "Analytics Path",
    nodes: [
      node("da-1", "Data Ingestion", "Pull data from multiple sources", 1, 0, [], "download"),
      node("da-2", "Transformation", "Clean and transform datasets", 2, 250, ["da-1"], "transform"),
      node("da-3", "Anomaly Detection", "Detect statistical anomalies", 3, 1000, ["da-2"], "alert"),
      node("da-4", "Predictive", "Generate predictive analytics", 4, 4000, ["da-3"], "crystal"),
    ],
  },
  infrastructure: {
    label: "Infrastructure Path",
    nodes: [
      node("in-1", "Provisioning", "Spin up and configure resources", 1, 0, [], "server"),
      node("in-2", "Scaling", "Auto-scale based on demand", 2, 250, ["in-1"], "expand"),
      node("in-3", "Disaster Recovery", "Automated backup and restore", 3, 1000, ["in-2"], "shield"),
      node("in-4", "Self-Healing", "Infrastructure repairs itself", 4, 4000, ["in-3"], "heart"),
    ],
  },
  specialized: {
    label: "Wildcard Path",
    nodes: [
      node("sp-1", "Adaptability", "Handle novel task types", 1, 0, [], "star"),
      node("sp-2", "Cross-Domain", "Apply skills from other categories", 2, 250, ["sp-1"], "merge"),
      node("sp-3", "Innovation", "Create novel solutions", 3, 1000, ["sp-2"], "lightbulb"),
      node("sp-4", "Singularity", "Transcend category boundaries", 4, 4000, ["sp-3"], "infinity"),
    ],
  },
};

export function getSkillTree(category: AgentCategory): SkillTree {
  const def = SKILL_TREES[category];
  return { category, ...def };
}

export function getSkillTreeWithUnlocks(category: AgentCategory, unlockedSkillIds: string[]): SkillTree {
  const tree = getSkillTree(category);
  return {
    ...tree,
    nodes: tree.nodes.map((n) => ({
      ...n,
      unlocked: unlockedSkillIds.includes(n.id),
    })),
  };
}

export function getUnlockableSkills(category: AgentCategory, xp: number, unlockedSkillIds: string[]): SkillNode[] {
  const tree = getSkillTree(category);
  return tree.nodes.filter((n) => {
    if (unlockedSkillIds.includes(n.id)) return false;
    if (xp < n.xpRequired) return false;
    return n.prerequisiteIds.every((pid) => unlockedSkillIds.includes(pid));
  });
}

export function getAllSkillTrees(): SkillTree[] {
  return (Object.keys(SKILL_TREES) as AgentCategory[]).map(getSkillTree);
}
