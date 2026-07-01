import { describe, it, expect } from 'vitest';
import { mulberry32, hashSeed } from '@/core/rng/prng';
import { makeChoreo } from './choreograph';

const rngFor = (seed: string) => mulberry32(hashSeed(seed));

describe('makeChoreo', () => {
  it('starts at the line and reaches exactly the finish at finishAt', () => {
    const c = makeChoreo(rngFor('a'), 0.7, 0.2);
    expect(c.positionAt(0)).toBeCloseTo(0, 6);
    expect(c.positionAt(0.7)).toBeCloseTo(1, 6);
  });

  it('distance is monotonically non-decreasing up to the finish', () => {
    const c = makeChoreo(rngFor('mono'), 0.85, 0.15);
    let prev = -Infinity;
    for (let i = 0; i <= 240; i++) {
      const t = (i / 240) * 0.85;
      const p = c.positionAt(t);
      expect(p).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = p;
    }
  });

  it('stays within [0, 1] before the finish', () => {
    const c = makeChoreo(rngFor('bounds'), 0.6, 0.3);
    for (let i = 0; i <= 200; i++) {
      const t = (i / 200) * 0.6;
      const p = c.positionAt(t);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it('coasts past the line after finishing, bounded by 1 + overrun', () => {
    const overrun = 0.25;
    const finishAt = 0.7;
    const c = makeChoreo(rngFor('coast'), finishAt, overrun);
    expect(c.positionAt(finishAt + 0.001)).toBeGreaterThan(1);
    const late = c.positionAt(finishAt + 10);
    expect(late).toBeGreaterThan(1);
    expect(late).toBeLessThanOrEqual(1 + overrun + 1e-9);
  });

  it('with zero overrun, holds exactly at the line after finishing', () => {
    const c = makeChoreo(rngFor('noover'), 0.5, 0);
    expect(c.positionAt(0.9)).toBeCloseTo(1, 6);
    expect(c.positionAt(5)).toBeCloseTo(1, 6);
  });

  it('is deterministic for a given rng seed', () => {
    const a = makeChoreo(rngFor('same'), 0.75, 0.2);
    const b = makeChoreo(rngFor('same'), 0.75, 0.2);
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      expect(a.positionAt(t)).toBeCloseTo(b.positionAt(t), 12);
    }
  });

  it('exposes the finishAt / overrun it was built with', () => {
    const c = makeChoreo(rngFor('meta'), 0.42, 0.33);
    expect(c.finishAt).toBe(0.42);
    expect(c.overrun).toBe(0.33);
  });
});
