import { NextRequest } from "next/server";
import { proposePlan } from "@/app/lib/agents/orchestrator";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { task } = body as { task?: string };

  if (!task || typeof task !== "string") {
    return Response.json({ error: "task is required" }, { status: 400 });
  }

  try {
    const plan = await proposePlan(task);
    return Response.json({ plan }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
