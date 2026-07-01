/**
 * Pure race simulation state + stepper. No three.js, no React — unit-testable.
 *
 * `createRaceState` turns the fair {@link DrawResult} into per-runner
 * choreography whose finish order provably equals `result.rankedIds`.
 * `stepRace` advances the normalized clock on a fixed timestep. `raceRanking`
 * reports live standings (and, once finished, equals `result.rankedIds`).
 */
import type { CreateStateArgs } from '@/core/mode/GameMode';
import { deriveStream } from '@/core/rng/hash';
import { makeChoreo, type Choreo } from './choreograph';
import {
  RACE_DURATION,
  FINISH_SPREAD,
  OVERRUN_MAX,
  REF_GAIT_SPEED,
  MIN_DISPLAY_LANES,
} from './raceTuning';

export interface RunnerViz {
  id: string;
  lane: number;
  /** Distance along the lane in laps (0 → start line; may exceed 1 on overrun). */
  position: number;
  /** Running-gait intensity 0..1 for the avatar's leg/arm swing. */
  gait: number;
  /** True once this runner has crossed the line. */
  finished: boolean;
  /** Normalized finish time (from choreography). */
  finishAt: number;
}

export interface RaceState {
  seed: string;
  rankedIds: string[];
  duration: number;
  /** Normalized race clock: elapsed / duration. Race ends at t = 1. */
  t: number;
  runners: RunnerViz[];
  trajectories: Choreo[];
  displayLanes: number;
  finished: boolean;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function createRaceState({ participants, result, seed }: CreateStateArgs): RaceState {
  const n = participants.length;
  const gap = n > 1 ? FINISH_SPREAD / (n - 1) : 0;

  // Finish times by rank: winner (rank 0) earliest → last place at t = 1.
  // Small deterministic jitter, then sort so order is guaranteed monotonic.
  const jitter = deriveStream(seed, 'viz:finish');
  const times: number[] = [];
  for (let r = 0; r < n; r++) {
    const base = 1 - FINISH_SPREAD + r * gap;
    times.push(clamp(base + (jitter() - 0.5) * gap * 0.6, 0.1, 1));
  }
  times.sort((a, b) => a - b);
  if (n === 1) times[0] = 0.85;

  const overrunByRank = (r: number): number => (n > 1 ? OVERRUN_MAX * (1 - r / (n - 1)) : 0);

  const runners: RunnerViz[] = [];
  const trajectories: Choreo[] = [];
  for (const p of participants) {
    const rank = result.rankedIds.indexOf(p.id);
    const rr = rank < 0 ? n - 1 : rank;
    const choreo = makeChoreo(deriveStream(seed, `viz:${p.id}`), times[rr]!, overrunByRank(rr));
    trajectories.push(choreo);
    runners.push({ id: p.id, lane: p.lane, position: 0, gait: 0, finished: false, finishAt: choreo.finishAt });
  }

  return {
    seed,
    rankedIds: result.rankedIds,
    duration: RACE_DURATION,
    t: 0,
    runners,
    trajectories,
    displayLanes: clamp(Math.max(n, MIN_DISPLAY_LANES), 1, 12),
    finished: false,
  };
}

/** Advance the race by a fixed real-time delta (seconds). */
export function stepRace(state: RaceState, fixedDtSec: number): void {
  const dtN = fixedDtSec / state.duration;
  state.t += dtN;

  for (let i = 0; i < state.runners.length; i++) {
    const runner = state.runners[i]!;
    const traj = state.trajectories[i]!;
    const prev = runner.position;
    const pos = traj.positionAt(state.t);
    const speed = dtN > 0 ? (pos - prev) / dtN : 0;
    runner.position = pos;
    runner.gait = clamp(speed / REF_GAIT_SPEED, 0, 1);
    runner.finished = state.t >= traj.finishAt;
  }

  state.finished = state.t >= 1;
}

/** Live standings, winner first. Equals `rankedIds` once the race has finished. */
export function raceRanking(state: RaceState): string[] {
  return state.runners
    .map((r) => ({ id: r.id, position: r.position, finishAt: r.finishAt }))
    .sort((a, b) => b.position - a.position || a.finishAt - b.finishAt)
    .map((r) => r.id);
}

export function raceIsFinished(state: RaceState): boolean {
  return state.finished;
}
