"use client";

import { useMemo } from "react";
import * as THREE from "three";

export function Ground() {
  const gridHelper = useMemo(() => {
    const grid = new THREE.GridHelper(80, 80, "#1a2a10", "#111611");
    grid.position.y = -0.01;
    return grid;
  }, []);

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#0d0d0d" roughness={0.95} />
      </mesh>

      <primitive object={gridHelper} />

      <PathLines />
    </>
  );
}

function PathLines() {
  const endpoints: [number, number][] = [
    [-8, -6], [8, -6], [-12, 4], [12, 4],
    [-6, 10], [6, 10], [0, -12], [0, 16],
  ];

  const lines = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({
      color: "#7FD642",
      transparent: true,
      opacity: 0.08,
    });
    return endpoints.map(([x, z]) => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.02, 0),
        new THREE.Vector3(x, 0.02, z),
      ]);
      return new THREE.Line(geo, mat);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {lines.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
    </>
  );
}
