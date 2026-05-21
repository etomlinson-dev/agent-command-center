import { NextRequest, NextResponse } from "next/server";
import { getRatchetHistory, getRatchetHistoryForAgent } from "@/app/lib/ratchet/ratchet-loop";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId");
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);

  const history = agentId
    ? getRatchetHistoryForAgent(agentId, limit)
    : getRatchetHistory(limit);

  return NextResponse.json({ history });
}
