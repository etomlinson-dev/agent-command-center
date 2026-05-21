"use client";

import { useGameStore } from "@/app/lib/game/state";
import { CATEGORY_META } from "@/app/types/agent";

const SCALE = 3.5;
const OFFSET = 50;

export function Minimap() {
  const agents = useGameStore((s) => s.agents);
  const buildings = useGameStore((s) => s.buildings);
  const selectedAgentId = useGameStore((s) => s.selectedAgentId);

  return (
    <div className="glass fixed bottom-4 right-4 z-20 w-[180px] h-[180px] p-2">
      <div className="text-[9px] uppercase tracking-wider text-[var(--ce-text-secondary)] font-semibold mb-1">
        Map
      </div>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        style={{ filter: "drop-shadow(0 0 2px rgba(127,214,66,0.2))" }}
      >
        {/* Buildings */}
        {buildings.map((b) => {
          const meta = CATEGORY_META[b.category];
          const x = b.position[0] * SCALE + OFFSET;
          const y = b.position[2] * SCALE + OFFSET;
          const w = b.size[0] * SCALE;
          const h = b.size[2] * SCALE;
          return (
            <rect
              key={b.id}
              x={x - w / 2}
              y={y - h / 2}
              width={w}
              height={h}
              fill={b.isActive ? `${meta.color}30` : "#1a1a1a"}
              stroke={meta.color}
              strokeWidth={0.5}
              strokeOpacity={0.4}
              rx={1}
            />
          );
        })}

        {/* Agents */}
        {agents.map((a) => {
          const x = a.position[0] * SCALE + OFFSET;
          const y = a.position[2] * SCALE + OFFSET;
          const isSelected = a.id === selectedAgentId;
          return (
            <circle
              key={a.id}
              cx={x}
              cy={y}
              r={isSelected ? 1.8 : 1}
              fill={a.accentColor}
              opacity={a.status === "working" ? 1 : 0.5}
            >
              {a.status === "working" && (
                <animate
                  attributeName="opacity"
                  values="1;0.4;1"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
              )}
            </circle>
          );
        })}
      </svg>
    </div>
  );
}
