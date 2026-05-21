import { NextRequest, NextResponse } from "next/server";
import { getRegistry } from "@/app/lib/agents/agent-registry";
import { spawnAgentTask, cancelAgentTask, getActiveSession } from "@/app/lib/agents/sdk-manager";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await params;
  const registry = getRegistry();
  const agent = registry.getAgent(agentId);

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const body = await request.json();
  const { prompt, cwd } = body as { prompt?: string; cwd?: string };

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  try {
    const task = await spawnAgentTask(agentId, prompt, cwd);
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await params;

  const session = getActiveSession(agentId);
  if (!session) {
    return NextResponse.json({ error: "No active task" }, { status: 404 });
  }

  const cancelled = cancelAgentTask(agentId);
  return NextResponse.json({ cancelled });
}
