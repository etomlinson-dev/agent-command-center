import { NextRequest, NextResponse } from "next/server";
import { getRegistry } from "@/app/lib/agents/agent-registry";
import { runRatchetCycle } from "@/app/lib/ratchet/ratchet-loop";
import type { AgentTask } from "@/app/types/task";

export async function POST(req: NextRequest) {
  try {
    const { agentId, task } = (await req.json()) as {
      agentId: string;
      task?: AgentTask;
    };

    const registry = getRegistry();
    const agent = registry.getAgent(agentId);
    if (!agent) {
      return NextResponse.json({ error: `Agent ${agentId} not found` }, { status: 404 });
    }

    const taskData = task ?? agent.currentTaskData;
    if (!taskData) {
      return NextResponse.json(
        { error: `No task data available for agent ${agentId}` },
        { status: 400 },
      );
    }

    const result = await runRatchetCycle(agent.data, taskData);

    if (!result) {
      return NextResponse.json(
        { error: "Ratchet cycle could not run (task not in terminal state)" },
        { status: 400 },
      );
    }

    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
