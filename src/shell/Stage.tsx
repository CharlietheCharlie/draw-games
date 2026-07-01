'use client';

/**
 * The WebGL stage: one persistent <Canvas> hosting the active mode and the
 * camera rig. Rendered only on the client (its parent is dynamically imported
 * with ssr:false), so it may safely touch WebGL and window.
 */
import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr } from '@react-three/drei';
import { isWebGLAvailable } from '@/lib/webgl';
import { Lighting } from './Lighting';
import { ActiveMode } from './ActiveMode';
import { CameraRig } from './CameraRig';
import { WebGLFallback } from './WebGLFallback';

export function Stage() {
  // Stage only renders on the client (its parent is dynamic ssr:false), so it's
  // safe to detect WebGL in the initializer — no effect / setState churn.
  const [webgl] = useState<boolean>(() => isWebGLAvailable());

  if (!webgl) return <WebGLFallback />;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 46, 62], fov: 45, near: 0.1, far: 600 }}
    >
      <color attach="background" args={['#a9d6f0']} />
      <fog attach="fog" args={['#a9d6f0', 130, 340]} />
      <Lighting />
      <Suspense fallback={null}>
        <ActiveMode />
      </Suspense>
      <CameraRig />
      <AdaptiveDpr pixelated />
    </Canvas>
  );
}
