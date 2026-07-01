'use client';

/**
 * Cel-shaded lighting with day/night presets. Day: a warm key "sun" casting soft
 * shadows, cool sky/ground fill, and a cool back rim light. Night: a dim cool
 * "moon" key plus low fill — the stadium floodlights (in StadiumEnv) do the rest.
 */
export function Lighting({ night = false, shadowExtent = 48 }: { night?: boolean; shadowExtent?: number }) {
  if (night) {
    return (
      <>
        <hemisphereLight args={['#1a2744', '#0a1120', 0.14]} />
        <ambientLight intensity={0.08} />
        <directionalLight
          castShadow
          position={[24, 46, -18]}
          intensity={0.22}
          color="#9fb2e0"
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
        {/* Floodlit field: a top-down cone lights the horizontal track/pitch
            strongly but the vertical stands only faintly → dark stadium, bright
            field (its default target is the origin, i.e. straight down). */}
        <spotLight position={[0, 62, 6]} angle={0.92} penumbra={0.6} intensity={1.3} distance={240} decay={0} color="#fff1d2" />
      </>
    );
  }
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
      <directionalLight position={[-30, 26, -34]} intensity={0.55} color="#bcd4ff" />
    </>
  );
}
