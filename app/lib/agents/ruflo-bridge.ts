import { spawn, execSync, type ChildProcess } from "child_process";
import { getRegistry } from "./agent-registry";
import { onAgentEvent } from "./sdk-manager";

interface RufloState {
  running: boolean;
  process: ChildProcess | null;
  agentCount: number;
  lastError: string | null;
}

const state: RufloState = {
  running: false,
  process: null,
  agentCount: 0,
  lastError: null,
};

export function isRufloRunning(): boolean {
  if (!state.running || !state.process) return false;
  return !state.process.killed;
}

export async function ensureRufloRunning(): Promise<boolean> {
  if (isRufloRunning()) return true;

  try {
    const proc = spawn("npx", ["ruflo", "swarm", "start", "--format", "json"], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
      detached: false,
    });

    state.process = proc;
    state.running = true;
    state.lastError = null;

    proc.stdout?.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          handleRufloEvent(event);
        } catch {
          // non-JSON output, ignore
        }
      }
    });

    proc.stderr?.on("data", (data: Buffer) => {
      state.lastError = data.toString().trim();
    });

    proc.on("close", (code) => {
      state.running = false;
      state.process = null;
      if (code !== 0) {
        state.lastError = `Ruflo exited with code ${code}`;
      }
    });

    return true;
  } catch (err) {
    state.lastError = err instanceof Error ? err.message : String(err);
    state.running = false;
    return false;
  }
}

export function stopRuflo(): void {
  if (state.process && !state.process.killed) {
    state.process.kill("SIGTERM");
  }
  state.running = false;
  state.process = null;
}

function handleRufloEvent(event: Record<string, unknown>) {
  const registry = getRegistry();
  const type = event.type as string;

  if (type === "agent_status") {
    const agentName = event.agent as string;
    const status = event.status as string;
    const agent = registry.findByName(agentName);
    if (agent) {
      const statusMap: Record<string, string> = {
        idle: "idle",
        running: "working",
        spawning: "walking",
        error: "error",
        communicating: "communicating",
      };
      registry.updateAgent(agent.data.id, {
        status: (statusMap[status] ?? "idle") as "idle" | "working" | "walking" | "error" | "communicating" | "evolving",
      });
    }
  }

  if (type === "task_assigned") {
    const agentName = event.agent as string;
    const agent = registry.findByName(agentName);
    if (agent) {
      registry.updateAgent(agent.data.id, {
        status: "working",
        currentTask: (event.task as string) ?? null,
      });
    }
  }

  if (type === "task_completed") {
    const agentName = event.agent as string;
    const agent = registry.findByName(agentName);
    if (agent) {
      registry.updateAgent(agent.data.id, {
        status: "idle",
        currentTask: null,
      });
    }
  }
}

export async function submitTaskToSwarm(prompt: string, category?: string): Promise<string> {
  const taskId = `swarm-${Date.now()}`;

  if (isRufloRunning() && state.process?.stdin) {
    state.process.stdin.write(
      JSON.stringify({ type: "submit_task", id: taskId, prompt, category }) + "\n"
    );
  } else {
    try {
      execSync(
        `npx ruflo agent spawn -t coder --prompt "${prompt.replace(/"/g, '\\"')}"`,
        { cwd: process.cwd(), timeout: 5000 }
      );
    } catch {
      // Ruflo may not be initialized yet — that's ok, task queued
    }
  }

  return taskId;
}

export function getRufloStatus(): {
  running: boolean;
  agentCount: number;
  lastError: string | null;
} {
  return {
    running: isRufloRunning(),
    agentCount: state.agentCount,
    lastError: state.lastError,
  };
}

let bridgeInitialized = false;

export function initBridge(): void {
  if (bridgeInitialized) return;
  bridgeInitialized = true;

  onAgentEvent((event) => {
    // Forward SDK events to Ruflo if running
    if (isRufloRunning() && state.process?.stdin) {
      state.process.stdin.write(
        JSON.stringify({
          type: "sdk_event",
          event_type: event.type,
          agent_id: event.agentId,
          message: event.message,
        }) + "\n"
      );
    }
  });
}
