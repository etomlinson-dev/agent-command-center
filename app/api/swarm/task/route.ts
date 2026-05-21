import { NextRequest, NextResponse } from "next/server";
import { spawnAgentTask } from "@/app/lib/agents/sdk-manager";
import { getRegistry } from "@/app/lib/agents/agent-registry";
import { submitTaskToSwarm } from "@/app/lib/agents/ruflo-bridge";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { prompt, agentId, category, cwd } = body as {
    prompt?: string;
    agentId?: string;
    category?: string;
    cwd?: string;
  };

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  // If specific agent requested, spawn directly
  if (agentId) {
    try {
      const task = await spawnAgentTask(agentId, prompt, cwd);
      return NextResponse.json({ task, routing: "direct" }, { status: 201 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status: 409 });
    }
  }

  // Otherwise route through the registry — find first idle agent matching category
  const registry = getRegistry();
  const agents = registry.getAllAgents();
  const candidates = agents.filter((a) => {
    if (category && a.data.category !== category) return false;
    return a.data.status === "idle";
  });

  if (candidates.length > 0) {
    const target = candidates[0];
    try {
      const task = await spawnAgentTask(target.data.id, prompt, cwd);
      return NextResponse.json({
        task,
        routing: "auto",
        assignedAgent: target.data.name,
      }, { status: 201 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status: 409 });
    }
  }

  // Fallback: queue with Ruflo
  const swarmTaskId = await submitTaskToSwarm(prompt, category);
  return NextResponse.json({
    taskId: swarmTaskId,
    routing: "swarm_queue",
    message: "Task queued in swarm — will be assigned when an agent is available",
  }, { status: 202 });
}
