export type AgentCategory =
  | "core-dev"
  | "swarm"
  | "consensus"
  | "github"
  | "performance"
  | "security"
  | "memory"
  | "browser"
  | "release"
  | "training"
  | "docs"
  | "architecture"
  | "communication"
  | "data"
  | "infrastructure"
  | "specialized";

export type AgentStatus =
  | "idle"
  | "walking"
  | "working"
  | "evolving"
  | "error"
  | "communicating";

export interface AgentData {
  id: string;
  name: string;
  role: string;
  category: AgentCategory;
  status: AgentStatus;
  position: [number, number, number];
  targetPosition: [number, number, number] | null;
  health: number;
  xp: number;
  level: number;
  currentTask: string | null;
  accentColor: string;
  icon: string;
  skills: string[];
  stats: {
    tasksCompleted: number;
    tasksFailed: number;
    totalIterations: number;
    avgIterations: number;
    ratchetImprovements: number;
    ratchetReverts: number;
    firstToolUses: string[];
  };
}

export const CATEGORY_META: Record<
  AgentCategory,
  { label: string; color: string; icon: string; buildingName: string }
> = {
  "core-dev": {
    label: "Core Development",
    color: "#7FD642",
    icon: "wrench",
    buildingName: "Central Workshop",
  },
  swarm: {
    label: "Swarm Coordination",
    color: "#A3E635",
    icon: "radio",
    buildingName: "Command Center",
  },
  consensus: {
    label: "Consensus Systems",
    color: "#38BDF8",
    icon: "orbit",
    buildingName: "Council Chamber",
  },
  github: {
    label: "GitHub Integration",
    color: "#7FD642",
    icon: "git-branch",
    buildingName: "The Forge",
  },
  performance: {
    label: "Performance",
    color: "#F59E0B",
    icon: "gauge",
    buildingName: "Watchtower",
  },
  security: {
    label: "Security",
    color: "#E53E3E",
    icon: "shield",
    buildingName: "War Room",
  },
  memory: {
    label: "Memory & Knowledge",
    color: "#A78BFA",
    icon: "brain",
    buildingName: "The Archive",
  },
  browser: {
    label: "Browser Automation",
    color: "#38BDF8",
    icon: "globe",
    buildingName: "The Factory",
  },
  release: {
    label: "Release & CI/CD",
    color: "#A3E635",
    icon: "rocket",
    buildingName: "Launch Pad",
  },
  training: {
    label: "Training & ML",
    color: "#A78BFA",
    icon: "neural",
    buildingName: "The Lab",
  },
  docs: {
    label: "Documentation",
    color: "#888888",
    icon: "scroll",
    buildingName: "The Library",
  },
  architecture: {
    label: "Architecture",
    color: "#F59E0B",
    icon: "blueprint",
    buildingName: "Design Studio",
  },
  communication: {
    label: "Communication",
    color: "#38BDF8",
    icon: "chat",
    buildingName: "Signal Tower",
  },
  data: {
    label: "Data & Analytics",
    color: "#A3E635",
    icon: "chart",
    buildingName: "Data Center",
  },
  infrastructure: {
    label: "Infrastructure",
    color: "#3A3A3A",
    icon: "server",
    buildingName: "Power Plant",
  },
  specialized: {
    label: "Specialized",
    color: "#E8E8E8",
    icon: "star",
    buildingName: "The Annex",
  },
};
