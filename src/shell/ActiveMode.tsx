'use client';

/**
 * Drives the active mode inside the Canvas. Owns the fixed-timestep loop:
 * advances the sim on a fixed dt (frame-rate independent), detects completion
 * and reports the ranking to the store, and renders the mode's Scene. The Scene
 * itself only reads state to place objects — all advancement happens here.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { getMode } from '@/core/mode/registry';
import { createStepper } from '@/core/sim/fixedStep';
import { useDrawStore } from '@/store/useDrawStore';

export function ActiveMode() {
  const modeId = useDrawStore((s) => s.activeModeId);
  const phase = useDrawStore((s) => s.phase);
  const state = useDrawStore((s) => s.state);
  const participants = useDrawStore((s) => s.participants);

  const mode = useMemo(() => getMode(modeId), [modeId]);
  const stepper = useMemo(() => createStepper(), []);
  const finishedRef = useRef(false);

  // A fresh state means a fresh race: reset the accumulator and finish latch.
  useEffect(() => {
    stepper.reset();
    finishedRef.current = false;
  }, [state, stepper]);

  useFrame((_, delta) => {
    if (phase !== 'running' || !state) return;
    stepper.tick(delta, (dt) => mode.step(state, dt));
    if (!finishedRef.current && mode.isFinished(state)) {
      finishedRef.current = true;
      useDrawStore.getState().finish(mode.getRanking(state));
    }
  });

  if (!state) return null;
  const Scene = mode.Scene;
  return <Scene state={state} participants={participants} phase={phase} />;
}
