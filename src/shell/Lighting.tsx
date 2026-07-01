'use client';

/**
 * Cel-shaded lighting: a warm key "sun" casting soft shadows, a cool sky/ground
 * hemisphere fill, and a cool back rim light to pop the toon silhouettes. Tuned
 * so the toon gradient reads as clean, painterly bands.
 */
export function Lighting({ shadowExtent = 48 }: { shadowExtent?: number }) {
  return (
    <>
      <hemisphereLight args={['#dff0ff', '#7fae6a', 0.65]} />
      <ambientLight intensity={0.32} />
      <directionalLight
        castShadow
        position={[36, 54, 22]}
        intensity={1.55}
        color="#fff2d6"
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
      {/* Cool back rim light — no shadows — for that toon edge glow. */}
      <directionalLight position={[-30, 26, -34]} intensity={0.55} color="#bcd4ff" />
    </>
  );
}
