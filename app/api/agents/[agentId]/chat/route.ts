import { NextRequest } from "next/server";
import { getRegistry } from "@/app/lib/agents/agent-registry";
import { startChatStream, cancelChatSession } from "@/app/lib/agents/chat-manager";
import { getActiveSession } from "@/app/lib/agents/sdk-manager";
import type { ChatMessage } from "@/app/types/chat";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await params;
  const registry = getRegistry();
  const agent = registry.getAgent(agentId);

  if (!agent) {
    return Response.json({ error: "Agent not found" }, { status: 404 });
  }

  if (getActiveSession(agentId)) {
    return Response.json(
      { error: "Agent has an active task — cancel it first" },
      { status: 409 },
    );
  }

  const body = await request.json();
  const { prompt, cwd } = body as { prompt?: string; cwd?: string };

  if (!prompt || typeof prompt !== "string") {
    return Response.json({ error: "prompt is required" }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          closed = true;
        }
      };

      const onMessage = (message: ChatMessage) => {
        send("message", message);
      };

      startChatStream(agentId, prompt, onMessage, cwd)
        .then(() => {
          if (!closed) {
            send("done", { timestamp: Date.now() });
            closed = true;
            try {
              controller.close();
            } catch {
              /* already closed */
            }
          }
        })
        .catch((err) => {
          send("error", {
            message: err instanceof Error ? err.message : String(err),
          });
          if (!closed) {
            closed = true;
            try {
              controller.close();
            } catch {
              /* already closed */
            }
          }
        });
    },
    cancel() {
      cancelChatSession(agentId);
    },
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await params;
  const cancelled = cancelChatSession(agentId);
  return Response.json({ cancelled });
}
