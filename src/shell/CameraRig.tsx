'use client';

/**
 * The single, cinematic camera. The active mode's CameraDirector describes where
 * to look; drei's CameraControls damps toward it (smooth transitions for free).
 *
 * The camera is fully SCRIPTED only during countdown/running while NOT paused.
 * In every other state — setup, result, and while PAUSED — the user may freely
 * orbit/zoom, and the camera-angle buttons still work (a chosen angle is applied
 * once, then the user can drag from there). Honors prefers-reduced-motion.
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
  const paused = useDrawStore((s) => s.paused);
  const mode = useMemo(() => getMode(modeId), [modeId]);
  const reduced = useReducedMotion();

  const lastPhase = useRef<string | null>(null);
  const lastPaused = useRef(false);
  const lastShot = useRef<string | null | undefined>(undefined);
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
    const scripted = (phase === 'countdown' || phase === 'running') && !paused;

    const shotForKey = (key: string | null): CameraShot => {
      if (key) {
        const named = director.namedShots(state);
        return named[key] ?? director.getShot(ctx);
      }
      return director.getShot(ctx);
    };

    // Phase change: set input mode + a one-time framing.
    if (phase !== lastPhase.current) {
      lastPhase.current = phase;
      lastPaused.current = paused;
      lastShot.current = shotKey;
      phaseStart.current = st.clock.elapsedTime;
      c.enabled = !scripted;
      applyShot(shotForKey(shotKey));
      return;
    }

    // Pause toggled: hand control to / take control from the user.
    if (paused !== lastPaused.current) {
      lastPaused.current = paused;
      c.enabled = !scripted;
    }

    // User picked a camera angle (works in any state, including paused).
    if (shotKey !== lastShot.current) {
      lastShot.current = shotKey;
      applyShot(shotForKey(shotKey));
    }

    // Continuous tracking only while actively scripted.
    if (scripted) {
      const shot = reduced ? director.namedShots(state).overview ?? director.getShot(ctx) : shotForKey(shotKey);
      applyShot(shot);
    }
  });

  return <CameraControls ref={controls} makeDefault smoothTime={DEFAULT_SMOOTH} minDistance={5} maxDistance={320} />;
}
