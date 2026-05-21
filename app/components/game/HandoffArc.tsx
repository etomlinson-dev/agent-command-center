"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "@/app/lib/game/state";

export function HandoffArcs() {
  const activeHandoffs = useGameStore((s) => s.activeHandoffs);
  const agents = useGameStore((s) => s.agents);

  return (
    <group>
      {activeHandoffs.map((handoff) => {
        const source = agents.find((a) => a.id === handoff.sourceAgentId);
        const target = agents.find((a) => a.id === handoff.targetAgentId);
        if (!source || !target) return null;

        return (
          <HandoffArcEffect
            key={handoff.id}
            from={source.position}
            to={target.position}
            sourceColor={source.accentColor}
            targetColor={target.accentColor}
          />
        );
      })}
    </group>
  );
}

function HandoffArcEffect({
  from,
  to,
  sourceColor,
  targetColor,
}: {
  from: [number, number, number];
  to: [number, number, number];
  sourceColor: string;
  targetColor: string;
}) {
  const particlesRef = useRef<THREE.Points>(null);
  const arcRef = useRef<THREE.Line>(null);
  const progressRef = useRef(0);

  const midY = useMemo(() => {
    const dx = to[0] - from[0];
    const dz = to[2] - from[2];
    return Math.sqrt(dx * dx + dz * dz) * 0.3 + 1;
  }, [from, to]);

  const curve = useMemo(() => {
    return new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(from[0], 0.2, from[2]),
      new THREE.Vector3((from[0] + to[0]) / 2, midY, (from[2] + to[2]) / 2),
      new THREE.Vector3(to[0], 0.2, to[2]),
    );
  }, [from, to, midY]);

  const arcGeometry = useMemo(() => {
    const points = curve.getPoints(40);
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [curve]);

  const arcMaterial = useMemo(() => {
    return new THREE.LineDashedMaterial({
      color: new THREE.Color(sourceColor),
      dashSize: 0.4,
      gapSize: 0.15,
      transparent: true,
      opacity: 0.6,
    });
  }, [sourceColor]);

  const particleCount = 8;
  const particlePositions = useMemo(() => new Float32Array(particleCount * 3), []);
  const particleSizes = useMemo(() => {
    const sizes = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      sizes[i] = 0.08 + Math.random() * 0.06;
    }
    return sizes;
  }, []);

  const particleGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(particleSizes, 1));
    return geo;
  }, [particlePositions, particleSizes]);

  const particleMat = useMemo(() => {
    return new THREE.PointsMaterial({
      color: new THREE.Color(targetColor),
      size: 0.12,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [targetColor]);

  useFrame(({ clock }) => {
    progressRef.current = (clock.getElapsedTime() * 0.6) % 1;

    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position;
      for (let i = 0; i < particleCount; i++) {
        const t = (progressRef.current + i / particleCount) % 1;
        const point = curve.getPoint(t);
        (positions as THREE.BufferAttribute).setXYZ(i, point.x, point.y, point.z);
      }
      positions.needsUpdate = true;
    }

    if (arcRef.current) {
      const mat = arcRef.current.material as THREE.LineDashedMaterial;
      mat.opacity = 0.3 + Math.sin(clock.getElapsedTime() * 3) * 0.3;
    }
  });

  return (
    <group>
      <primitive
        ref={arcRef}
        object={new THREE.Line(arcGeometry, arcMaterial)}
        onUpdate={(line: THREE.Line) => line.computeLineDistances()}
      />
      <points ref={particlesRef} geometry={particleGeo} material={particleMat} />

      {/* Source glow */}
      <pointLight
        position={[from[0], 0.5, from[2]]}
        color={sourceColor}
        intensity={2}
        distance={3}
        decay={2}
      />
      {/* Target glow */}
      <pointLight
        position={[to[0], 0.5, to[2]]}
        color={targetColor}
        intensity={2}
        distance={3}
        decay={2}
      />
    </group>
  );
}
