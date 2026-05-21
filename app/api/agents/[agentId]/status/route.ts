import { NextRequest, NextResponse } from "next/server";
import { getRegistry } from "@/app/lib/agents/agent-registry";
import { getActiveSession } from "@/app/lib/agents/sdk-manager";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await params;
  const registry = getRegistry();
  const agent = registry.getAgent(agentId);

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const session = getActiveSession(agentId);

  return NextResponse.json({
    agent: agent.data,
    isReal: agent.isReal,
    hasActiveSession: !!session,
    currentTask: agent.currentTaskData,
    profile: {
      allowedTools: agent.profile.allowedTools,
      permissionMode: agent.profile.permissionMode,
    },
  });
}
