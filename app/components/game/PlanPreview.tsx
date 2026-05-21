"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "@/app/lib/game/state";

export function PlanPreview() {
  const previewPlanId = useGameStore((s) => s.previewPlanId);
  const plans = useGameStore((s) => s.plans);
  const agents = useGameStore((s) => s.agents);
  const buildings = useGameStore((s) => s.buildings);

  const plan = plans.find((p) => p.id === previewPlanId);

  if (!plan || plan.status !== "proposed") return null;

  return (
    <group>
      {plan.agents.map((pa, i) => {
        const agent = agents.find((a) => a.id === pa.agentId);
        const building = buildings.find(
          (b) => b.name === pa.targetBuilding,
        );

        if (!agent) return null;

        return (
          <group key={i}>
            <PreviewRing
              position={agent.position}
              color={pa.accentColor}
            />
            {building && (
              <DashedPath
                from={agent.position}
                to={building.position}
                color={pa.accentColor}
              />
            )}
          </group>
        );
      })}
    </group>
  );
}

function PreviewRing({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
  const ringRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (ringRef.current) {
      const scale = 1 + Math.sin(clock.getElapsedTime() * 3) * 0.15;
      ringRef.current.scale.set(scale, scale, scale);
    }
    if (glowRef.current) {
      glowRef.current.intensity =
        0.8 + Math.sin(clock.getElapsedTime() * 3) * 0.4;
    }
  });

  return (
    <group position={[position[0], 0.05, position[2]]}>
      <mesh ref={ringRef} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.5, 0.6, 32]} />
        <meshBasicMaterial
          color="#38BDF8"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
      <pointLight
        ref={glowRef}
        color={color}
        intensity={0.8}
        distance={3}
        position={[0, 0.5, 0]}
      />
    </group>
  );
}

function DashedPath({
  from,
  to,
  color,
}: {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
}) {
  const lineRef = useRef<THREE.Line>(null);

  const geometry = useMemo(() => {
    const points = [
      new THREE.Vector3(from[0], 0.08, from[2]),
      new THREE.Vector3(to[0], 0.08, to[2]),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [from, to]);

  const material = useMemo(() => {
    return new THREE.LineDashedMaterial({
      color: new THREE.Color(color),
      dashSize: 0.3,
      gapSize: 0.2,
      transparent: true,
      opacity: 0.5,
    });
  }, [color]);

  useFrame(({ clock }) => {
    if (lineRef.current) {
      const mat = lineRef.current.material as THREE.LineDashedMaterial;
      mat.opacity = 0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.2;
    }
  });

  return (
    <primitive
      ref={lineRef}
      object={new THREE.Line(geometry, material)}
      onUpdate={(line: THREE.Line) => line.computeLineDistances()}
    />
  );
}
