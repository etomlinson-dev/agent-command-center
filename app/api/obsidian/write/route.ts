import { NextRequest, NextResponse } from "next/server";
import { getRegistry } from "@/app/lib/agents/agent-registry";
import { getAgentConfig, getRatchetHistoryForAgent } from "@/app/lib/ratchet/ratchet-loop";
import { writeAgentProfile, writeMetrics } from "@/app/lib/obsidian/writer";

export async function POST(req: NextRequest) {
  try {
    const { agentId, type } = (await req.json()) as {
      agentId: string;
      type: "profile" | "metrics" | "all";
    };

    const registry = getRegistry();
    const agent = registry.getAgent(agentId);
    if (!agent) {
      return NextResponse.json({ error: `Agent ${agentId} not found` }, { status: 404 });
    }

    const config = getAgentConfig(agentId);
    const paths: string[] = [];

    if (type === "profile" || type === "all") {
      paths.push(await writeAgentProfile(agent.data, config));
    }

    if (type === "metrics" || type === "all") {
      const results = getRatchetHistoryForAgent(agentId);
      paths.push(await writeMetrics(agent.data, results));
    }

    return NextResponse.json({ paths });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
