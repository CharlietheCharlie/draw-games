/**
 * The plugin contract every draw mechanism implements.
 *
 * Race is the first mode; roulette and ladder (Amidakuji) will implement the
 * same interface and drop into the registry with zero shell changes. The shell
 * treats `TState` as an opaque, live, mutable handle: it constructs it once via
 * `createState`, advances it with `step` on a fixed timestep, asks `isFinished`
 * / `getRanking`, and renders `Scene`. Crucially `createState` receives the
 * already-decided {@link DrawResult}: a mode animates *toward* the fair outcome,
 * it never decides the winner.
 */
import type { ComponentType } from 'react';
import type { Participant, DrawResult, DrawPhase } from '@/lib/types';
import type { CameraDirector } from './CameraDirector';

export interface ModeSceneProps<TState> {
  /** Live, mutable simulation state — advanced outside React each frame. */
  state: TState;
  participants: Participant[];
  phase: DrawPhase;
}

export interface CreateStateArgs {
  participants: Participant[];
  /** Winner + full order already chosen by the fairness core. */
  result: DrawResult;
  /** Seed for deterministic *cosmetic* jitter (never affects the outcome). */
  seed: string;
}

export interface GameMode<TState> {
  /** Stable id, e.g. 'race' | 'roulette' | 'ladder'. */
  id: string;
  /** Human-facing label for the mode picker. */
  label: string;
  /** Max participants this mode supports (race = 12). */
  maxParticipants: number;

  createState(args: CreateStateArgs): TState;
  /** Advance the sim by a fixed dt (seconds). Pure w.r.t. the outcome. */
  step(state: TState, fixedDtSec: number): void;
  isFinished(state: TState): boolean;
  /** Live standings (winner first). MUST equal `result.rankedIds` once finished. */
  getRanking(state: TState): string[];

  Scene: ComponentType<ModeSceneProps<TState>>;
  camera: CameraDirector<TState>;
}

/** A mode with its state type erased — how the registry and shell hold modes. */
export type AnyGameMode = GameMode<unknown>;
