/**
 * Race choreography — the bridge between "who won" (already decided, fairly) and
 * "what the race looks like". Pure, deterministic, closed-form.
 *
 * Each runner gets a strictly-increasing distance curve `positionAt(t)` built
 * from a positive speed profile, so motion is always forward (monotonic) yet
 * wobbles for mid-race lead changes. The curve reaches the finish line
 * (position 1) exactly at `finishAt`; because `finishAt` is ordered by the
 * predetermined rank, the crossing order is guaranteed to match the fair result.
 * After finishing, runners coast a little past the line (`overrun`) so the final
 * frame strings the leaders out along the finish straight for the podium shot.
 */
import type { Rng } from '@/core/rng/prng';
import { randRange } from '@/core/rng/prng';

const OVERRUN_TAU = 0.08; // normalized-time constant for the post-finish coast

export interface Choreo {
  /** Normalized time (0,1] at which this runner crosses the finish line. */
  finishAt: number;
  /** Extra laps coasted after finishing (for podium spacing). */
  overrun: number;
  /** Distance along the lane at normalized time t (0 → start, 1 → finish line). */
  positionAt(t: number): number;
}

/**
 * Build a choreography curve for one runner.
 *
 * Speed v(t) = 1 + amp·Σ aₖ·sin(wₖt + φₖ). With amp·Σ|aₖ| < 1 the speed stays
 * positive (monotonic distance), and the wobble produces lead changes. The
 * distance is the closed-form integral G(t), normalized so G(finishAt) = 1.
 */
export function makeChoreo(rng: Rng, finishAt: number, overrun: number): Choreo {
  const amp = 0.5;
  const terms = [
    { a: 1.0, w: 2 * Math.PI * randRange(rng, 1.0, 1.6), phi: randRange(rng, 0, 2 * Math.PI) },
    { a: 0.6, w: 2 * Math.PI * randRange(rng, 1.8, 3.0), phi: randRange(rng, 0, 2 * Math.PI) },
  ]; // amp * (1.0 + 0.6) = 0.8 < 1  → v(t) > 0 always

  const G = (t: number): number => {
    let s = t;
    for (const { a, w, phi } of terms) {
      s += (amp * a * (Math.cos(phi) - Math.cos(w * t + phi))) / w;
    }
    return s;
  };

  const Gf = G(finishAt);

  return {
    finishAt,
    overrun,
    positionAt(t: number): number {
      if (t <= finishAt) return G(t) / Gf;
      return 1 + overrun * (1 - Math.exp(-(t - finishAt) / OVERRUN_TAU));
    },
  };
}
