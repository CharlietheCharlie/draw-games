/**
 * Race choreography — the bridge between "who won" (already decided, fairly) and
 * "what the race looks like". Pure, deterministic.
 *
 * Each runner gets a strictly-increasing distance curve `positionAt(t)` built by
 * integrating a positive, natural-feeling speed profile: a burst out of the
 * blocks, organic mid-race surges (lead changes), and a finishing kick. The
 * curve reaches the finish line (position 1) exactly at `finishAt`; because
 * `finishAt` is ordered by the predetermined rank, the crossing order is
 * guaranteed to match the fair result. After finishing, runners coast a little
 * past the line (`overrun`) so the final frame strings the podium out.
 */
import type { Rng } from '@/core/rng/prng';
import { randRange } from '@/core/rng/prng';

const OVERRUN_TAU = 0.08; // normalized-time constant for the post-finish coast
const SAMPLES = 240; // integration resolution per runner

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

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
 * Speed v(t) = burst(t) · (1 + amp·Σ aₖ·sin(wₖt + φₖ)) · kick(t), which stays
 * strictly positive (so distance is monotonic) while accelerating from the line,
 * surging mid-race, and kicking at the end. The cumulative distance is integrated
 * numerically and normalized so it equals 1 exactly at `finishAt`.
 */
export function makeChoreo(rng: Rng, finishAt: number, overrun: number): Choreo {
  const amp = 0.42;
  const terms = [
    { a: 1.0, w: 2 * Math.PI * randRange(rng, 0.8, 1.4), phi: randRange(rng, 0, 2 * Math.PI) },
    { a: 0.55, w: 2 * Math.PI * randRange(rng, 1.7, 2.8), phi: randRange(rng, 0, 2 * Math.PI) },
  ]; // amp·Σ|a| = 0.65 < 1 → the wobble factor is always > 0

  const speed = (t: number): number => {
    const burst = 0.22 + 0.78 * smoothstep(0, 0.12, t); // accelerate out of the blocks
    let wob = 0;
    for (const { a, w, phi } of terms) wob += a * Math.sin(w * t + phi);
    const kick = 1 + 0.4 * smoothstep(0.68, 1, finishAt > 0 ? t / finishAt : t); // finishing kick
    return burst * (1 + amp * wob) * kick;
  };

  // Integrate cumulative distance over [0, finishAt] (trapezoid rule).
  const dt = finishAt / SAMPLES;
  const cum = new Array<number>(SAMPLES + 1);
  cum[0] = 0;
  let acc = 0;
  for (let i = 1; i <= SAMPLES; i++) {
    acc += 0.5 * (speed((i - 1) * dt) + speed(i * dt)) * dt;
    cum[i] = acc;
  }
  const total = cum[SAMPLES]! || 1;

  const distanceBefore = (t: number): number => {
    const x = (Math.min(Math.max(t, 0), finishAt) / finishAt) * SAMPLES;
    const i = Math.min(SAMPLES - 1, Math.floor(x));
    const f = x - i;
    return (cum[i]! + (cum[i + 1]! - cum[i]!) * f) / total;
  };

  return {
    finishAt,
    overrun,
    positionAt(t: number): number {
      if (t <= finishAt) return distanceBefore(t);
      return 1 + overrun * (1 - Math.exp(-(t - finishAt) / OVERRUN_TAU));
    },
  };
}
