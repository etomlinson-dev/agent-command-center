"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Group } from "three";
import { useGameStore } from "@/app/lib/game/state";

const FLOAT_SPEED = 1.2;
const LIFETIME = 2000;

function FloatingXPText({
  amount,
  position,
  timestamp,
  bonus,
}: {
  amount: number;
  position: [number, number, number];
  timestamp: number;
  bonus?: string;
}) {
  const groupRef = useRef<Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    const age = (Date.now() - timestamp) / 1000;
    groupRef.current.position.y = position[1] + 1.5 + age * FLOAT_SPEED;
  });

  const age = Date.now() - timestamp;
  const opacity = Math.max(0, 1 - age / LIFETIME);

  return (
    <group ref={groupRef} position={[position[0], position[1] + 1.5, position[2]]}>
      <Html center style={{ pointerEvents: "none" }}>
        <div
          className="flex flex-col items-center gap-0.5"
          style={{ opacity, transition: "opacity 0.1s" }}
        >
          <span
            className="text-lg font-mono font-black tabular-nums"
            style={{
              color: "#A3E635",
              textShadow: "0 0 12px rgba(163, 230, 53, 0.8), 0 0 24px rgba(163, 230, 53, 0.4)",
            }}
          >
            +{amount} XP
          </span>
          {bonus && (
            <span
              className="text-[9px] font-semibold uppercase tracking-wider"
              style={{
                color: "#7FD642",
                textShadow: "0 0 8px rgba(127, 214, 66, 0.6)",
              }}
            >
              {bonus}
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}

export function FloatingXPLayer() {
  const floatingXPEvents = useGameStore((s) => s.floatingXPEvents);

  if (floatingXPEvents.length === 0) return null;

  return (
    <group>
      {floatingXPEvents.map((evt) => (
        <FloatingXPText
          key={evt.id}
          amount={evt.amount}
          position={evt.position}
          timestamp={evt.timestamp}
          bonus={evt.bonus}
        />
      ))}
    </group>
  );
}
