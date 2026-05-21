"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const SNOW_COUNT = 400;
const SPARK_COUNT = 60;

export function SnowParticles() {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(SNOW_COUNT * 3);
    for (let i = 0; i < SNOW_COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 60;
      arr[i * 3 + 1] = Math.random() * 20;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    return arr;
  }, []);

  const velocities = useMemo(() => {
    const arr = new Float32Array(SNOW_COUNT);
    for (let i = 0; i < SNOW_COUNT; i++) {
      arr[i] = 0.2 + Math.random() * 0.5;
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < SNOW_COUNT; i++) {
      arr[i * 3 + 1] -= velocities[i] * delta;
      arr[i * 3] += Math.sin(arr[i * 3 + 1] * 0.5 + i) * 0.002;
      if (arr[i * 3 + 1] < -1) {
        arr[i * 3 + 1] = 18 + Math.random() * 2;
        arr[i * 3] = (Math.random() - 0.5) * 60;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 60;
      }
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={SNOW_COUNT} />
      </bufferGeometry>
      <pointsMaterial size={0.08} color="#c8c8c8" transparent opacity={0.3} sizeAttenuation depthWrite={false} />
    </points>
  );
}

export function GreenSparks() {
  const ref = useRef<THREE.Points>(null);

  const { positions, lifetimes } = useMemo(() => {
    const pos = new Float32Array(SPARK_COUNT * 3);
    const life = new Float32Array(SPARK_COUNT);
    for (let i = 0; i < SPARK_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = Math.random() * 3;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
      life[i] = Math.random();
    }
    return { positions: pos, lifetimes: life };
  }, []);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < SPARK_COUNT; i++) {
      lifetimes[i] -= delta * 0.3;
      arr[i * 3 + 1] += delta * 0.8;
      if (lifetimes[i] <= 0) {
        arr[i * 3] = (Math.random() - 0.5) * 40;
        arr[i * 3 + 1] = 0.5;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 40;
        lifetimes[i] = 0.5 + Math.random() * 1.5;
      }
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={SPARK_COUNT} />
      </bufferGeometry>
      <pointsMaterial size={0.12} color="#7FD642" transparent opacity={0.6} sizeAttenuation depthWrite={false} />
    </points>
  );
}
