import { describe, it, expect } from 'vitest';
import { createStepper } from './fixedStep';

/** Count how many fixed steps a single tick fires. */
function countSteps(stepper: ReturnType<typeof createStepper>, rawDelta: number): number {
  let n = 0;
  stepper.tick(rawDelta, () => n++);
  return n;
}

describe('fixedStep accumulator', () => {
  it('fires exactly one step for one step-worth of delta', () => {
    const s = createStepper(1 / 60);
    expect(countSteps(s, 1 / 60)).toBe(1);
  });

  it('accumulates sub-step deltas without advancing, returning the alpha fraction', () => {
    const s = createStepper(1 / 60);
    let steps = 0;
    const alpha = s.tick(1 / 120, () => steps++); // half a step
    expect(steps).toBe(0);
    expect(alpha).toBeCloseTo(0.5, 6);
  });

  it('fires multiple steps when several accumulate in one tick', () => {
    const s = createStepper(1 / 60);
    expect(countSteps(s, 3 / 60)).toBe(3);
  });

  it('always returns leftover alpha in [0, 1)', () => {
    const s = createStepper(1 / 60);
    for (const d of [0, 1 / 240, 1 / 90, 1 / 60, 2.5 / 60, 5 / 60]) {
      const alpha = s.tick(d, () => {});
      expect(alpha).toBeGreaterThanOrEqual(0);
      expect(alpha).toBeLessThan(1);
    }
  });

  it('clamps a huge delta (backgrounded tab) to maxDelta — no spiral of death', () => {
    const step = 1 / 60;
    const maxDelta = 0.25;
    const s = createStepper(step, maxDelta);
    // 10s of delta would be 600 steps; clamped to 0.25s → at most maxDelta/step steps.
    const steps = countSteps(s, 10);
    expect(steps).toBe(Math.floor(maxDelta / step)); // 15
  });

  it('reset() drops any partial accumulation', () => {
    const s = createStepper(1 / 60);
    s.tick(1 / 120, () => {}); // leave half a step banked
    s.reset();
    let steps = 0;
    const alpha = s.tick(1 / 60, () => steps++);
    expect(steps).toBe(1); // the banked half was cleared, so exactly one step
    expect(alpha).toBeCloseTo(0, 6);
  });

  it('is frame-rate independent: same wall-clock time → same step count (±1 for float rounding)', () => {
    // 1 second of simulation fed at 60Hz vs 144Hz should yield ~60 fixed steps
    // either way. It can land one short because e.g. 144·(1/144) ≠ 1.0 exactly in
    // floating point — the accumulator is frame-rate independent to within a step.
    const at60 = createStepper(1 / 60);
    const at144 = createStepper(1 / 60);
    let a = 0;
    let b = 0;
    for (let i = 0; i < 60; i++) at60.tick(1 / 60, () => a++);
    for (let i = 0; i < 144; i++) at144.tick(1 / 144, () => b++);
    expect(a).toBe(60);
    expect(b).toBeGreaterThanOrEqual(59);
    expect(b).toBeLessThanOrEqual(60);
  });
});
