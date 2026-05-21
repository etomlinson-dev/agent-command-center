"use client";

import { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Group, Mesh } from "three";
import * as THREE from "three";
import type { AgentData } from "@/app/types/agent";
import { useGameStore } from "@/app/lib/game/state";
import { xpForNextLevel } from "@/app/types/gamification";

interface AgentSpriteProps {
  agent: AgentData;
}

const MOVE_SPEED = 3;
const ARRIVE_THRESHOLD = 0.5;

export function AgentSprite({ agent }: AgentSpriteProps) {
  const groupRef = useRef<Group>(null);
  const bodyRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const color = useMemo(() => new THREE.Color(agent.accentColor), [agent.accentColor]);
  const selectAgent = useGameStore((s) => s.selectAgent);
  const selectedAgentId = useGameStore((s) => s.selectedAgentId);
  const updateAgent = useGameStore((s) => s.updateAgent);
  const isSelected = selectedAgentId === agent.id;
  const idNum = parseInt(agent.id.replace("agent-", ""), 10);

  useFrame(({ clock }) => {
    if (!groupRef.current || !bodyRef.current) return;
    const t = clock.getElapsedTime();
    const dt = clock.getDelta();
    const offset = idNum * 0.7;

    // Movement toward target position
    if (agent.targetPosition) {
      const dx = agent.targetPosition[0] - agent.position[0];
      const dz = agent.targetPosition[2] - agent.position[2];
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > ARRIVE_THRESHOLD) {
        const step = Math.min(MOVE_SPEED * (dt || 0.016), dist);
        const nx = dx / dist;
        const nz = dz / dist;
        const newPos: [number, number, number] = [
          agent.position[0] + nx * step,
          0,
          agent.position[2] + nz * step,
        ];
        groupRef.current.position.set(newPos[0], groupRef.current.position.y, newPos[2]);

        // Face movement direction
        groupRef.current.rotation.y = Math.atan2(nx, nz);

        // Update store position (throttled via frame)
        updateAgent(agent.id, { position: newPos });
      } else {
        updateAgent(agent.id, {
          position: agent.targetPosition,
          targetPosition: null,
          status: agent.status === "walking" ? "idle" : agent.status,
        });
      }
    }

    switch (agent.status) {
      case "idle": {
        const breathe = 1 + Math.sin((t + offset) * 1.5) * 0.03;
        groupRef.current.scale.setScalar(breathe);
        break;
      }
      case "walking": {
        groupRef.current.position.y = Math.sin((t + offset) * 4) * 0.05;
        break;
      }
      case "working": {
        bodyRef.current.rotation.x = Math.sin((t + offset) * 3) * 0.1;
        break;
      }
      case "evolving": {
        groupRef.current.position.y = 0.3 + Math.sin((t + offset) * 2) * 0.15;
        groupRef.current.rotation.y = t * 2;
        break;
      }
      case "error": {
        const shake = Math.sin((t + offset) * 20) * 0.05;
        groupRef.current.position.x = agent.position[0] + shake;
        break;
      }
      case "communicating":
        break;
    }

    const targetScale = hovered || isSelected ? 1.1 : 1;
    const s = groupRef.current.scale.x;
    groupRef.current.scale.setScalar(s + (targetScale - s) * 0.1);
  });

  const healthPct = agent.health / 100;
  const healthColor = healthPct > 0.6 ? "#7FD642" : healthPct > 0.3 ? "#F59E0B" : "#E53E3E";

  return (
    <group
      ref={groupRef}
      position={agent.position}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
      onClick={(e) => { e.stopPropagation(); selectAgent(isSelected ? null : agent.id); }}
    >
      {/* Body capsule — renderOrder + depthTest off so agents always visible */}
      <mesh ref={bodyRef} position={[0, 0.4, 0]} renderOrder={10}>
        <capsuleGeometry args={[0.15, 0.4, 4, 8]} />
        <meshStandardMaterial color="#141414" roughness={0.5} metalness={0.3} depthTest={false} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.85, 0]} renderOrder={10}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.3} depthTest={false} />
      </mesh>

      {/* Outline glow */}
      <mesh position={[0, 0.4, 0]} renderOrder={9}>
        <capsuleGeometry args={[0.18, 0.44, 4, 8]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={hovered || isSelected ? 0.4 : 0.15}
          emissive={color}
          emissiveIntensity={hovered || isSelected ? 1 : 0.3}
          side={THREE.BackSide}
          depthTest={false}
        />
      </mesh>

      {/* Selection ring on ground */}
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={8}>
          <ringGeometry args={[0.4, 0.5, 32]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} transparent opacity={0.6} depthTest={false} />
        </mesh>
      )}

      {/* Role icon dot */}
      <mesh position={[0, 1.15, 0]} renderOrder={11}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} depthTest={false} />
      </mesh>

      {agent.status === "error" && (
        <pointLight position={[0, 0.5, 0]} color="#E53E3E" intensity={2} distance={2} decay={2} />
      )}
      {agent.status === "evolving" && (
        <pointLight position={[0, 0.5, 0]} color="#A3E635" intensity={3} distance={3} decay={2} />
      )}

      {(hovered || isSelected) && (
        <Html position={[0, 1.5, 0]} center style={{ pointerEvents: "none" }}>
          <div className="glass px-3 py-2 min-w-[180px] text-xs whitespace-nowrap">
            <div className="font-semibold text-[var(--ce-text-primary)]">{agent.name}</div>
            <div className="text-[var(--ce-text-secondary)] text-[10px]">{agent.role} · Lv.{agent.level}</div>
            {/* Health bar */}
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-[9px] text-[var(--ce-text-secondary)]">HP</span>
              <div className="h-1.5 flex-1 rounded-full bg-[var(--ce-gray-mid)]">
                <div className="h-full rounded-full transition-all" style={{ width: `${agent.health}%`, backgroundColor: healthColor }} />
              </div>
              <span className="text-[9px]" style={{ color: healthColor }}>{Math.round(agent.health)}%</span>
            </div>
            {/* XP progress bar */}
            <XPMiniBar xp={agent.xp} accentColor={agent.accentColor} />
            {agent.currentTask && (
              <div className="mt-1 text-[var(--ce-text-accent)] text-[10px] truncate">{agent.currentTask}</div>
            )}
            <div className="mt-1 text-[9px] text-[var(--ce-text-secondary)]">
              {agent.stats.tasksCompleted} tasks · {agent.skills.length} skills
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

function XPMiniBar({ xp, accentColor }: { xp: number; accentColor: string }) {
  const prog = xpForNextLevel(xp);
  return (
    <div className="mt-1 flex items-center gap-1.5">
      <span className="text-[9px] text-[var(--ce-text-secondary)]">XP</span>
      <div className="h-1.5 flex-1 rounded-full bg-[var(--ce-gray-mid)]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${prog.progress * 100}%`, backgroundColor: accentColor }}
        />
      </div>
      <span className="text-[9px] font-mono tabular-nums" style={{ color: accentColor }}>
        {xp}
      </span>
    </div>
  );
}
