import { NextResponse } from "next/server";
import { getRegistry } from "@/app/lib/agents/agent-registry";
import { getActiveSessions } from "@/app/lib/agents/sdk-manager";
import { getRufloStatus } from "@/app/lib/agents/ruflo-bridge";

export const dynamic = "force-dynamic";

export async function GET() {
  const registry = getRegistry();
  const agents = registry.getAllAgents();
  const activeSessions = getActiveSessions();
  const ruflo = getRufloStatus();

  const byStatus = {
    idle: 0,
    working: 0,
    walking: 0,
    evolving: 0,
    error: 0,
    communicating: 0,
  };

  for (const agent of agents) {
    byStatus[agent.data.status]++;
  }

  return NextResponse.json({
    totalAgents: agents.length,
    realAgents: agents.filter((a) => a.isReal).length,
    activeSessions: activeSessions.length,
    statusBreakdown: byStatus,
    ruflo,
  });
}
