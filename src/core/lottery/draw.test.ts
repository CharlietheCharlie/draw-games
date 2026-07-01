import { describe, it, expect } from 'vitest';
import { drawResult } from './draw';
import type { Participant } from '@/lib/types';

function makeParticipants(n: number): Participant[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, lane: i }));
}

const idIndex = (id: string) => Number(id.slice(1));

describe('drawResult', () => {
  it('is deterministic for a given seed', () => {
    const ps = makeParticipants(8);
    expect(drawResult(ps, 'seed-123').rankedIds).toEqual(drawResult(ps, 'seed-123').rankedIds);
  });

  it('returns a permutation of the participant ids', () => {
    const ps = makeParticipants(8);
    const r = drawResult(ps, 'abc');
    expect([...r.rankedIds].sort()).toEqual(ps.map((p) => p.id).sort());
  });

  it('picks the winner uniformly across seeds (~1/n)', () => {
    const n = 6;
    const ps = makeParticipants(n);
    const trials = 60000;
    const counts = new Array<number>(n).fill(0);

    for (let s = 0; s < trials; s++) {
      const winner = drawResult(ps, `s${s}`).rankedIds[0]!;
      counts[idIndex(winner)] = (counts[idIndex(winner)] ?? 0) + 1;
    }

    const expected = trials / n;
    // Chi-square (df = 5); the 0.1% critical value is ≈ 20.5.
    const chi = counts.reduce((acc, c) => acc + (c - expected) ** 2 / expected, 0);
    expect(chi).toBeLessThan(20.5);
    for (const c of counts) expect(Math.abs(c - expected) / expected).toBeLessThan(0.1);
  });

  it('is uniform at EVERY finishing position, not just first place', () => {
    const n = 5;
    const ps = makeParticipants(n);
    const trials = 50000;
    // counts[participant][position]
    const counts = Array.from({ length: n }, () => new Array<number>(n).fill(0));

    for (let s = 0; s < trials; s++) {
      const order = drawResult(ps, `x${s}`).rankedIds;
      order.forEach((id, pos) => {
        const row = counts[idIndex(id)]!;
        row[pos] = (row[pos] ?? 0) + 1;
      });
    }

    const expected = trials / n;
    for (let i = 0; i < n; i++) {
      for (let pos = 0; pos < n; pos++) {
        const c = counts[i]![pos]!;
        expect(Math.abs(c - expected) / expected).toBeLessThan(0.12);
      }
    }
  });
});
