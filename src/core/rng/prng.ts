/**
 * Deterministic, seedable pseudo-random number generators.
 *
 * We never use Math.random() for anything that affects an outcome OR a visual
 * that must be reproducible from a seed. Everything flows from these functions.
 */

/**
 * mulberry32 — a tiny, fast, well-distributed 32-bit PRNG.
 * Given the same 32-bit seed it always yields the same stream of floats in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a hash of a string to an unsigned 32-bit int. Used to seed {@link mulberry32}. */
export function hashSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A source of deterministic random numbers in [0, 1). */
export type Rng = () => number;

/** Random integer in [0, maxExclusive) — unbiased for the small ranges we use. */
export function randInt(rng: Rng, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive);
}

/** Pick one element of a non-empty array. */
export function pick<T>(rng: Rng, arr: readonly T[]): T {
  // Callers pass non-empty literal arrays; the assertion documents that invariant.
  return arr[Math.floor(rng() * arr.length)]!;
}

/** Random float in [min, max). */
export function randRange(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}
