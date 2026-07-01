/**
 * Shared, mode-independent domain types.
 *
 * Nothing in this file imports three.js or React — it is the vocabulary the
 * pure domain layer (fairness, characters, simulations) and the UI both speak.
 */

export type Gender = 'male' | 'female';

/** A person taking part in the draw. */
export interface Participant {
  /** Stable id (uuid). Used as the RNG salt for this person's avatar, so their
   *  look stays constant across renames, replays, and future game modes. */
  id: string;
  name: string;
  /** Lane / slot index assigned when a draw starts (0-based). */
  lane: number;
}

/**
 * The canonical, mode-independent outcome of a draw.
 *
 * `rankedIds[0]` is the WINNER; the array is a full finishing order and is a
 * uniform-random permutation of the participant ids (see {@link module:core/lottery/draw}).
 * Every visual mode (race today; roulette / ladder later) must *converge* to
 * this order — it never decides the winner itself.
 */
export interface DrawResult {
  /** The seed the result was derived from — makes any draw replayable/auditable. */
  seed: string;
  /** Full finishing order, winner first. A uniform-random permutation of ids. */
  rankedIds: string[];
  /** Optional cosmetic finish times, aligned to `rankedIds`. Never affects fairness. */
  finishTimes?: number[];
}

/** Lifecycle of a single draw, driven by the shell. */
export type DrawPhase = 'setup' | 'countdown' | 'running' | 'result';

/** Hard ceiling on lanes/participants for the race mode (and the UI). */
export const MAX_PARTICIPANTS = 12;
