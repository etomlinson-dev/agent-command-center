"use client";

import { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import type { Mesh } from "three";
import * as THREE from "three";
import type { Building as BuildingType } from "@/app/types/game";
import { CATEGORY_META } from "@/app/types/agent";
import { useGameStore } from "@/app/lib/game/state";

interface BuildingProps {
  building: BuildingType;
}

export function Building({ building }: BuildingProps) {
  const glowRef = useRef<Mesh>(null);
  const meta = CATEGORY_META[building.category];
  const color = useMemo(() => new THREE.Color(meta.color), [meta.color]);
  const isOrchestrator = building.category === "core-dev";
  const [w, h, d] = building.size;
  const [hovered, setHovered] = useState(false);
  const selectBuilding = useGameStore((s) => s.selectBuilding);
  const selectedBuildingId = useGameStore((s) => s.selectedBuildingId);
  const isSelected = selectedBuildingId === building.id;

  const edgeLines = useMemo(() => {
    const box = new THREE.BoxGeometry(w, h, d);
    const edges = new THREE.EdgesGeometry(box);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 });
    return new THREE.LineSegments(edges, mat);
  }, [w, h, d, color]);

  useFrame((_, delta) => {
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshStandardMaterial;
      const base = building.isActive ? 0.15 + building.glowIntensity * 0.2 : 0.02;
      const target = isSelected ? 0.5 : hovered ? 0.35 : base;
      mat.opacity += (target - mat.opacity) * delta * 3;
      mat.emissiveIntensity = isSelected ? 1.2 : hovered ? 0.8 : building.isActive ? 0.5 : 0.1;
    }
  });

  return (
    <group position={building.position}>
      {/* Main body — clickable */}
      <mesh
        position={[0, h / 2, 0]}
        castShadow
        receiveShadow
        onClick={(e) => { e.stopPropagation(); selectBuilding(isSelected ? null : building.id); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
      >
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={isSelected ? "#252525" : hovered ? "#202020" : "#1a1a1a"}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>

      {/* Edge glow */}
      <primitive object={edgeLines} position={[0, h / 2, 0]} />

      {/* Top glow panel */}
      <mesh ref={glowRef} position={[0, h + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w - 0.2, d - 0.2]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.1}
          emissive={color}
          emissiveIntensity={building.isActive ? 0.5 : 0.1}
        />
      </mesh>

      {isOrchestrator && <OrchestratorCore color={color} height={h} />}

      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(w, d) / 2 + 0.3, Math.max(w, d) / 2 + 0.5, 32]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {building.isActive && (
        <pointLight position={[0, h + 1, 0]} color={meta.color} intensity={isSelected ? 1.5 : 0.8} distance={isSelected ? 12 : 8} decay={2} />
      )}

      <Billboard position={[0, h + 0.8, 0]}>
        <Text
          fontSize={0.4}
          color="#E8E8E8"
          anchorX="center"
          anchorY="bottom"
          font={undefined}
        >
          {building.name}
        </Text>
      </Billboard>
    </group>
  );
}

function OrchestratorCore({ color, height }: { color: THREE.Color; height: number }) {
  const meshRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1 + Math.sin(t * 2) * 0.5;
      meshRef.current.rotation.y = t * 0.5;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, height / 2, 0]}>
      <octahedronGeometry args={[0.6, 0]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} transparent opacity={0.8} />
    </mesh>
  );
}
