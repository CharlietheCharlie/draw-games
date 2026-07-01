/**
 * Seed derivation — the RNG "firewall".
 *
 * A single user-facing seed spawns many *independent* deterministic streams,
 * one per purpose ("outcome", "viz", "avatar:<id>", ...). Because each salt
 * hashes to a disjoint 32-bit seed, cosmetic randomness (lead-change wobble,
 * avatar looks) is structurally incapable of influencing the winner, which is
 * drawn only from the "outcome" stream. This is what keeps the lottery fair
 * while still letting the race look lively and stay fully reproducible.
 */
import { mulberry32, hashSeed, type Rng } from './prng';

/**
 * Derive an independent, deterministic stream from `(seed, salt)`.
 * Same inputs → same stream, forever; different salts → uncorrelated streams.
 */
export function deriveStream(seed: string, salt: string): Rng {
  return mulberry32(hashSeed(`${seed}::${salt}`));
}

/** Well-known salts, centralised so the firewall boundaries are explicit. */
export const STREAM = {
  /** The ONLY stream allowed to decide the winner. */
  outcome: 'outcome',
  /** Cosmetic race choreography (lead changes, jitter). Never touches the outcome. */
  viz: 'viz',
  /** Per-participant avatar appearance. */
  avatar: (participantId: string) => `avatar:${participantId}`,
} as const;
