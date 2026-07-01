/**
 * Camera contract. A mode *describes* where the camera should be; the shell's
 * CameraRig owns the single real camera and smoothly damps toward these shots.
 * Deliberately three.js-free (plain tuples) so modes stay renderer-agnostic.
 */
import type { DrawPhase, DrawResult } from '@/lib/types';

export type Vec3 = [number, number, number];

export interface CameraShot {
  /** World-space camera position. */
  position: Vec3;
  /** World-space point the camera looks at. */
  target: Vec3;
  /** Optional per-shot damping time in seconds (rig default otherwise). */
  smoothTime?: number;
}

export interface CameraContext<TState> {
  state: TState;
  phase: DrawPhase;
  /** The predetermined result once a draw has started, else null. */
  result: DrawResult | null;
  /** Seconds since the current phase began. */
  elapsed: number;
}

export interface CameraDirector<TState> {
  /**
   * The automatic shot for the current frame. On the `result` phase this should
   * frame the top finishers (podium auto-focus).
   */
  getShot(ctx: CameraContext<TState>): CameraShot;
  /** Named angles the HUD lets the user cycle during `running`. */
  namedShots(state: TState): Record<string, CameraShot>;
}
