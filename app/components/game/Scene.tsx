"use client";

import { Canvas } from "@react-three/fiber";
import { OrthographicCamera, MapControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Suspense } from "react";
import { Settlement } from "./Settlement";
import { Lighting } from "./Lighting";
import { SnowParticles, GreenSparks } from "./ParticleEffects";
import { Ground } from "./Ground";
import { useGameStore } from "@/app/lib/game/state";

export function Scene() {
  const handlePointerMissed = () => {
    const state = useGameStore.getState();
    if (state.selectedAgentId) state.selectAgent(null);
    if (state.selectedBuildingId) state.selectBuilding(null);
  };

  return (
    <Canvas
      shadows
      gl={{
        antialias: true,
        toneMapping: 3,
        toneMappingExposure: 1.2,
      }}
      style={{ background: "#0A0A0A" }}
      onPointerMissed={handlePointerMissed}
    >
      {/* Classic isometric: camera at 45° azimuth, ~35° elevation */}
      <OrthographicCamera
        makeDefault
        position={[30, 25, 30]}
        zoom={24}
        near={0.1}
        far={200}
      />

      <MapControls
        enableRotate={false}
        enableDamping
        dampingFactor={0.15}
        minZoom={10}
        maxZoom={70}
        screenSpacePanning
      />

      <fog attach="fog" args={["#0A0A0A", 50, 90]} />

      <Suspense fallback={null}>
        <Lighting />
        <Ground />
        <Settlement />
        <SnowParticles />
        <GreenSparks />
      </Suspense>

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.6}
          luminanceSmoothing={0.9}
          intensity={0.4}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
