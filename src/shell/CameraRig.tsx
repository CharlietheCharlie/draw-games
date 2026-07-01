'use client';

/**
 * The single, cinematic camera. The active mode's CameraDirector describes where
 * to look; drei's CameraControls damps toward it (smooth transitions for free).
 * During countdown/running the camera is fully scripted (user input disabled);
 * during setup/result the user may freely orbit/zoom to inspect the scene and
 * the podium. Honors prefers-reduced-motion by holding a static overview.
 */
import { useMemo, useRef, type ComponentRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import { getMode } from '@/core/mode/registry';
import type { CameraShot } from '@/core/mode/CameraDirector';
import { useDrawStore } from '@/store/useDrawStore';
import { useReducedMotion } from '@/lib/useReducedMotion';

const DEFAULT_SMOOTH = 0.55;

export function CameraRig() {
  const controls = useRef<ComponentRef<typeof CameraControls>>(null);
  const modeId = useDrawStore((s) => s.activeModeId);
  const phase = useDrawStore((s) => s.phase);
  const state = useDrawStore((s) => s.state);
  const result = useDrawStore((s) => s.result);
  const shotKey = useDrawStore((s) => s.cameraShotKey);
  const mode = useMemo(() => getMode(modeId), [modeId]);
  const reduced = useReducedMotion();

  const lastPhase = useRef<string | null>(null);
  const phaseStart = useRef(0);

  const applyShot = (shot: CameraShot) => {
    const c = controls.current;
    if (!c) return;
    c.smoothTime = shot.smoothTime ?? DEFAULT_SMOOTH;
    const [px, py, pz] = shot.position;
    const [tx, ty, tz] = shot.target;
    void c.setLookAt(px, py, pz, tx, ty, tz, true);
  };

  useFrame((st) => {
    const c = controls.current;
    if (!c || !state) return;

    const elapsed = st.clock.elapsedTime - phaseStart.current;
    const ctx = { state, phase, result, elapsed } as const;
    const director = mode.camera;

    // On phase entry: set input mode + do a one-time framing for static phases.
    if (phase !== lastPhase.current) {
      lastPhase.current = phase;
      phaseStart.current = st.clock.elapsedTime;
      // Free orbit while setting up or admiring the result; scripted otherwise.
      c.enabled = phase === 'setup' || phase === 'result';
      applyShot(director.getShot(ctx));
      return;
    }

    // While running, the camera tracks continuously.
    if (phase === 'running') {
      const named = director.namedShots(state);
      let shot: CameraShot;
      if (reduced) shot = named.overview ?? director.getShot(ctx);
      else if (shotKey && named[shotKey]) shot = named[shotKey]!;
      else shot = director.getShot(ctx);
      applyShot(shot);
    }
  });

  return <CameraControls ref={controls} makeDefault smoothTime={DEFAULT_SMOOTH} minDistance={5} maxDistance={260} />;
}
