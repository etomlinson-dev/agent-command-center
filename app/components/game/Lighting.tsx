"use client";

export function Lighting() {
  return (
    <>
      <ambientLight color="#1a2a10" intensity={0.6} />

      <directionalLight
        position={[10, 20, 10]}
        color="#d4e8c0"
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={60}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />

      <directionalLight
        position={[-8, 15, -8]}
        color="#2a3a1a"
        intensity={0.3}
      />

      <pointLight
        position={[0, 4, 0]}
        color="#7FD642"
        intensity={2}
        distance={15}
        decay={2}
      />

      <hemisphereLight
        color="#1a2a10"
        groundColor="#0a0a0a"
        intensity={0.4}
      />
    </>
  );
}
