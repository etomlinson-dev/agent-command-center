import type { HandoffEvent } from "@/app/types/plan";

type HandoffListener = (handoff: HandoffEvent) => void;
const listeners = new Set<HandoffListener>();

const recentHandoffs: HandoffEvent[] = [];
const MAX_HANDOFFS = 100;

export function emitHandoff(handoff: HandoffEvent) {
  recentHandoffs.push(handoff);
  if (recentHandoffs.length > MAX_HANDOFFS) {
    recentHandoffs.shift();
  }
  for (const cb of listeners) {
    try {
      cb(handoff);
    } catch {
      listeners.delete(cb);
    }
  }
}

export function onHandoff(cb: HandoffListener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getRecentHandoffs(): HandoffEvent[] {
  return [...recentHandoffs];
}
