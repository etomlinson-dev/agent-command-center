"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "@/app/lib/game/state";

const WANDER_RADIUS = 3;
const MIN_PAUSE = 2;
const MAX_PAUSE = 6;

interface WanderState {
  nextWanderAt: number;
}

export function AgentWander() {
  const stateRef = useRef<Map<string, WanderState>>(new Map());

  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();
    const store = useGameStore.getState();
    const { agents, buildings } = store;

    for (const agent of agents) {
      if (agent.status !== "idle" || agent.targetPosition) continue;

      let ws = stateRef.current.get(agent.id);
      if (!ws) {
        ws = { nextWanderAt: now + Math.random() * MAX_PAUSE };
        stateRef.current.set(agent.id, ws);
      }

      if (now < ws.nextWanderAt) continue;

      const building = buildings.find((b) => b.category === agent.category);
      if (!building) continue;

      const angle = Math.random() * Math.PI * 2;
      const minR = Math.max(building.size[0], building.size[2]) / 2 + 0.5;
      const radius = minR + Math.random() * WANDER_RADIUS;

      const targetPosition: [number, number, number] = [
        building.position[0] + Math.cos(angle) * radius,
        0,
        building.position[2] + Math.sin(angle) * radius,
      ];

      store.updateAgent(agent.id, {
        targetPosition,
        status: "walking",
      });

      ws.nextWanderAt = now + MIN_PAUSE + Math.random() * (MAX_PAUSE - MIN_PAUSE);
    }
  });

  return null;
}
