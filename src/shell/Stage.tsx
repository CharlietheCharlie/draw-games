'use client';

/**
 * The WebGL stage: one persistent <Canvas> hosting the active mode and the
 * camera rig, with a cel-shaded, open-air look (gradient sky, soft shadows,
 * gentle fog). Rendered only on the client (its parent is dynamically imported
 * with ssr:false), so it may safely touch WebGL and window.
 */
import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr } from '@react-three/drei';
import { isWebGLAvailable } from '@/lib/webgl';
import { silenceClockDeprecation } from '@/lib/silenceClockDeprecation';
import { SceneBackdrop } from './SceneBackdrop';
import { ActiveMode } from './ActiveMode';
import { CameraRig } from './CameraRig';
import { WebGLFallback } from './WebGLFallback';

// Install before any <Canvas> mounts so R3F's internal `new THREE.Clock()`
// doesn't spam the console with three's r183 deprecation warning.
silenceClockDeprecation();

export function Stage() {
  // Stage only renders on the client (its parent is dynamic ssr:false), so it's
  // safe to detect WebGL in the initializer — no effect / setState churn.
  const [webgl] = useState<boolean>(() => isWebGLAvailable());

  if (!webgl) return <WebGLFallback />;

  return (
    <Canvas
      // "percentage" = three's built-in PCF soft shadows (compatible with this
      // three version; drei <SoftShadows> PCSS is not, so we avoid it).
      shadows="percentage"
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 46, 62], fov: 45, near: 0.1, far: 700 }}
    >
      <SceneBackdrop />
      <Suspense fallback={null}>
        <ActiveMode />
      </Suspense>
      <CameraRig />
      <AdaptiveDpr pixelated />
    </Canvas>
  );
}
