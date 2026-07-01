/**
 * Fixed-timestep accumulator.
 *
 * Simulations must advance in constant increments so the choreography is
 * identical on 30 / 60 / 144 Hz displays and across machines. Each frame we feed
 * the raw frame delta; it is consumed in fixed `step`-second slices. The raw
 * delta is clamped to `maxDelta` so a backgrounded tab (which produces a huge
 * delta on return) can't trigger a "spiral of death" of catch-up steps.
 */
export interface Stepper {
  /**
   * Consume `rawDelta` seconds, calling `advance(step)` zero or more times.
   * Returns the leftover fraction in [0, 1) for optional render interpolation.
   */
  tick(rawDelta: number, advance: (dt: number) => void): number;
  reset(): void;
}

export function createStepper(step = 1 / 60, maxDelta = 0.25): Stepper {
  let acc = 0;
  return {
    tick(rawDelta, advance) {
      acc += Math.min(rawDelta, maxDelta);
      while (acc >= step) {
        advance(step);
        acc -= step;
      }
      return acc / step;
    },
    reset() {
      acc = 0;
    },
  };
}
