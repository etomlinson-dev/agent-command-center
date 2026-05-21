"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "@/app/lib/game/state";

const PARTICLE_COUNT = 24;
const EFFECT_DURATION = 3;

interface EvolutionParticle {
  offset: number;
  speed: number;
  radius: number;
  height: number;
}

export function EvolutionEffects() {
  const agents = useGameStore((s) => s.agents);
  const evolvingAgents = agents.filter((a) => a.status === "evolving");

  return (
    <group>
      {evolvingAgents.map((agent) => (
        <EvolutionBurst
          key={`evo-${agent.id}`}
          position={agent.position}
          color={agent.accentColor}
        />
      ))}
    </group>
  );
}

function EvolutionBurst({ position, color }: { position: [number, number, number]; color: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const startTime = useRef(0);
  const threeColor = useMemo(() => new THREE.Color(color), [color]);

  const particles = useMemo<EvolutionParticle[]>(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      offset: (i / PARTICLE_COUNT) * Math.PI * 2,
      speed: 0.8 + Math.random() * 1.2,
      radius: 0.3 + Math.random() * 0.5,
      height: 0.5 + Math.random() * 1.5,
    })),
  []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    if (startTime.current === 0) startTime.current = clock.getElapsedTime();

    const elapsed = clock.getElapsedTime() - startTime.current;
    const progress = Math.min(elapsed / EFFECT_DURATION, 1);

    groupRef.current.children.forEach((child, i) => {
      const p = particles[i];
      const t = elapsed * p.speed;
      const mesh = child as THREE.Mesh;

      mesh.position.x = Math.cos(t + p.offset) * p.radius * (1 + progress);
      mesh.position.y = p.height * progress + Math.sin(t * 2) * 0.1;
      mesh.position.z = Math.sin(t + p.offset) * p.radius * (1 + progress);

      const scale = (1 - progress) * 0.08;
      mesh.scale.setScalar(Math.max(0.01, scale));

      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = (1 - progress) * 0.8;
      mat.emissiveIntensity = 2 + Math.sin(t * 4) * 1;
    });
  });

  return (
    <group ref={groupRef} position={position}>
      {particles.map((_, i) => (
        <mesh key={i} renderOrder={15}>
          <sphereGeometry args={[1, 6, 6]} />
          <meshStandardMaterial
            color={threeColor}
            emissive={threeColor}
            emissiveIntensity={2}
            transparent
            opacity={0.8}
            depthTest={false}
          />
        </mesh>
      ))}
      <pointLight color={color} intensity={4} distance={5} decay={2} />
    </group>
  );
}
