import { getRegistry } from "@/app/lib/agents/agent-registry";
import { onAgentEvent, onUsageUpdate, getUsage } from "@/app/lib/agents/sdk-manager";
import { onPlanUpdate, getAllPlans } from "@/app/lib/agents/orchestrator";
import { onHandoff } from "@/app/lib/agents/handoff-manager";
import { onRatchetEvent } from "@/app/lib/ratchet/ratchet-loop";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();
  const registry = getRegistry();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const cleanup = () => {
        if (closed) return;
        closed = true;
        unsubState();
        unsubEvent();
        unsubPlan();
        unsubHandoff();
        unsubRatchet();
        unsubUsage();
        clearInterval(heartbeat);
      };

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          cleanup();
        }
      };

      send("init", {
        agents: registry.getAllAgentData(),
        plans: getAllPlans(),
        usage: getUsage(),
        timestamp: Date.now(),
      });

      const unsubState = registry.onStateChange((agentId, update) => {
        send("agent_update", { agentId, update, timestamp: Date.now() });
      });

      const unsubEvent = onAgentEvent((event) => {
        send("event", { ...event, timestamp: Date.now() });
      });

      const unsubPlan = onPlanUpdate((plan) => {
        send("plan_update", { plan, timestamp: Date.now() });
      });

      const unsubHandoff = onHandoff((handoff) => {
        send("handoff", { handoff, timestamp: Date.now() });
      });

      const unsubRatchet = onRatchetEvent((event) => {
        send("ratchet", { ...event, timestamp: Date.now() });
      });

      const unsubUsage = onUsageUpdate((usageData) => {
        send("usage", { usage: usageData, timestamp: Date.now() });
      });

      const heartbeat = setInterval(() => {
        send("heartbeat", { timestamp: Date.now() });
      }, 15000);
    },
    cancel() {},
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
