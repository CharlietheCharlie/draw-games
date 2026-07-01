'use client';

/** Scene lighting: soft sky/ground fill plus one shadow-casting sun sized to the track. */
export function Lighting({ shadowExtent = 46 }: { shadowExtent?: number }) {
  return (
    <>
      <hemisphereLight args={['#cfe6ff', '#5c6b3f', 0.8]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        castShadow
        position={[38, 58, 26]}
        intensity={1.15}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={220}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-bias={-0.0004}
      />
    </>
  );
}
