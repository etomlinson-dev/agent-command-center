import { NextRequest } from "next/server";
import { executePlan, getPlan } from "@/app/lib/agents/orchestrator";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { planId } = body as { planId?: string };

  if (!planId || typeof planId !== "string") {
    return Response.json({ error: "planId is required" }, { status: 400 });
  }

  const plan = getPlan(planId);
  if (!plan) {
    return Response.json({ error: "Plan not found" }, { status: 404 });
  }

  if (plan.status !== "proposed") {
    return Response.json(
      { error: `Plan is ${plan.status}, cannot approve` },
      { status: 409 },
    );
  }

  try {
    const executed = await executePlan(planId);
    return Response.json({ plan: executed });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
