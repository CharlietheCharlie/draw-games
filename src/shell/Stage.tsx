'use client';

/**
 * The WebGL stage: one persistent <Canvas> hosting the active mode and the
 * camera rig, with a cel-shaded, open-air look (gradient sky, soft shadows,
 * gentle fog). Rendered only on the client (its parent is dynamically imported
 * with ssr:false), so it may safely touch WebGL and window.
 */
import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, SoftShadows } from '@react-three/drei';
import { isWebGLAvailable } from '@/lib/webgl';
import { useDrawStore } from '@/store/useDrawStore';
import { Lighting } from './Lighting';
import { GradientSky } from './GradientSky';
import { ActiveMode } from './ActiveMode';
import { CameraRig } from './CameraRig';
import { WebGLFallback } from './WebGLFallback';

export function Stage() {
  // Stage only renders on the client (its parent is dynamic ssr:false), so it's
  // safe to detect WebGL in the initializer — no effect / setState churn.
  const [webgl] = useState<boolean>(() => isWebGLAvailable());
  const paused = useDrawStore((s) => s.paused);

  if (!webgl) return <WebGLFallback />;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      // Pausing freezes the whole render loop — a true freeze-frame.
      frameloop={paused ? 'never' : 'always'}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 46, 62], fov: 45, near: 0.1, far: 600 }}
    >
      <fog attach="fog" args={['#eaf6ef', 150, 360]} />
      <SoftShadows size={18} samples={12} focus={0.85} />
      <GradientSky />
      <Lighting />
      <Suspense fallback={null}>
        <ActiveMode />
      </Suspense>
      <CameraRig />
      <AdaptiveDpr pixelated />
    </Canvas>
  );
}
