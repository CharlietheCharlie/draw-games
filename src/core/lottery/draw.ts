/**
 * The fairness core. No three.js, no React — pure, deterministic, testable.
 *
 * The winner (and full finishing order) is decided HERE, before any animation,
 * by a seeded Fisher–Yates shuffle over the dedicated "outcome" stream. Because
 * Fisher–Yates over a uniform generator makes every one of the n! orderings
 * equally likely, every participant has probability exactly 1/n of being ranked
 * first — independent of name, lane, or entry order. The result is a pure
 * function of (participant ids, seed), so any draw is byte-for-byte replayable
 * and auditable from its seed.
 */
import type { Participant, DrawResult } from '@/lib/types';
import { deriveStream, STREAM } from '@/core/rng/hash';

/**
 * Produce the canonical {@link DrawResult} for a set of participants and a seed.
 * `rankedIds[0]` is the winner.
 */
export function drawResult(participants: Participant[], seed: string): DrawResult {
  const rnd = deriveStream(seed, STREAM.outcome);
  const ids = participants.map((p) => p.id);

  // Fisher–Yates: for each i from the end, swap with a uniformly random j in [0, i].
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1)); // unbiased index in [0, i]
    const tmp = ids[i]!;
    ids[i] = ids[j]!;
    ids[j] = tmp;
  }

  return { seed, rankedIds: ids };
}

/** Convenience: the winning id for a result (or null if there were no entrants). */
export function winnerOf(result: DrawResult): string | null {
  return result.rankedIds[0] ?? null;
}
