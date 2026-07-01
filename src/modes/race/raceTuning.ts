/** Tunable constants for the race mode, gathered in one place. */
import type { StadiumDims } from '@/core/geometry/stadium';

/** Oval dimensions (metres). */
export const STADIUM: StadiumDims = { straight: 26, radius: 9, laneWidth: 1.25 };

/** Wall-clock seconds for the whole race (normalized clock t: 0 → 1). */
export const RACE_DURATION = 13;

/**
 * Spread of finish times across the field, in normalized time. The winner
 * crosses at t = 1 - SPREAD; last place at t = 1. Bigger = more strung-out field.
 */
export const FINISH_SPREAD = 0.28;

/** How far (in laps) the earliest finishers coast past the line, so the final
 *  tableau strings the podium out along the finish straight. */
export const OVERRUN_MAX = 0.05;

/** Normalized speed that maps to a full-tilt running gait (leg cadence). */
export const REF_GAIT_SPEED = 1.4;

/** Always draw at least this many lanes so the stadium reads like a real track. */
export const MIN_DISPLAY_LANES = 6;
