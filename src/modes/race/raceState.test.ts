import { describe, it, expect } from 'vitest';
import { drawResult } from '@/core/lottery/draw';
import { createRaceState, stepRace, raceRanking, type RaceState } from './raceState';
import type { Participant } from '@/lib/types';

function makeParticipants(n: number): Participant[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, lane: i }));
}

function runToEnd(n: number, seed: string): { state: RaceState; rankedIds: string[] } {
  const ps = makeParticipants(n);
  const result = drawResult(ps, seed);
  const state = createRaceState({ participants: ps, result, seed });
  let guard = 0;
  while (!state.finished && guard++ < 100000) stepRace(state, 1 / 60);
  return { state, rankedIds: result.rankedIds };
}

describe('race simulation', () => {
  it('final crossing order equals the fair predetermined order', () => {
    for (const seed of ['a', 'b', 'c', 'seed-42', 'xyz', 'LUCKY']) {
      const { state, rankedIds } = runToEnd(9, seed);
      expect(raceRanking(state)).toEqual(rankedIds);
    }
  });

  it('keeps every runner moving forward (monotonic distance)', () => {
    const ps = makeParticipants(7);
    const seed = 'mono';
    const result = drawResult(ps, seed);
    const state = createRaceState({ participants: ps, result, seed });
    const prev = state.runners.map((r) => r.position);
    let guard = 0;
    while (!state.finished && guard++ < 100000) {
      stepRace(state, 1 / 60);
      state.runners.forEach((r, i) => {
        expect(r.position).toBeGreaterThanOrEqual(prev[i]! - 1e-9);
        prev[i] = r.position;
      });
    }
  });

  it('is fully deterministic for a seed', () => {
    expect(raceRanking(runToEnd(10, 'zzz').state)).toEqual(raceRanking(runToEnd(10, 'zzz').state));
  });

  it('keeps gait within [0, 1] throughout', () => {
    const ps = makeParticipants(5);
    const seed = 'gait';
    const result = drawResult(ps, seed);
    const state = createRaceState({ participants: ps, result, seed });
    let guard = 0;
    while (!state.finished && guard++ < 100000) {
      stepRace(state, 1 / 60);
      for (const r of state.runners) {
        expect(r.gait).toBeGreaterThanOrEqual(0);
        expect(r.gait).toBeLessThanOrEqual(1);
      }
    }
  });
});
