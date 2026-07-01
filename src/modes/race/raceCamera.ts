/**
 * Camera director for the race: named angles the user can cycle, plus automatic
 * shots per phase — an establishing overview, a start-line angle, a smooth
 * broadcast shot that pans with the pack while running, and an auto podium
 * framing of the top finishers on the result phase. Pure (returns plain tuples).
 *
 * All running shots track a CONTINUOUS focus (the pack's front by arc length,
 * interpolated by render alpha) rather than snapping to whichever runner is
 * momentarily ahead — so the camera never jitters when the lead changes.
 */
import type { CameraDirector, CameraShot } from '@/core/mode/CameraDirector';
import { laneRadius, pointAtU, trackExtent } from '@/core/geometry/stadium';
import { STADIUM } from './raceTuning';
import { raceRanking, type RaceState } from './raceState';

function outerRadius(state: RaceState): number {
  return laneRadius(STADIUM, state.displayLanes - 1) + STADIUM.laneWidth;
}

/** Interpolated distance of the front-most runner (continuous in time). */
function frontU(state: RaceState): number {
  let max = 0;
  for (const r of state.runners) {
    const u = r.prevPosition + (r.position - r.prevPosition) * state.alpha;
    if (u > max) max = u;
  }
  return max;
}

const MID_LANE = (state: RaceState) => (state.displayLanes - 1) / 2;

function overview(state: RaceState): CameraShot {
  const ext = trackExtent(STADIUM.straight, outerRadius(state));
  const d = Math.max(ext.x, ext.z);
  return { position: [0, d * 1.2, d * 1.55], target: [0, 1.5, 0], smoothTime: 0.9 };
}

/** Smooth broadcast: orbit the outside of the track, tracking the pack front. */
function broadcast(state: RaceState): CameraShot {
  const pt = pointAtU(STADIUM, MID_LANE(state), frontU(state));
  const len = Math.hypot(pt.x, pt.z) || 1;
  const nx = pt.x / len; // outward normal (track is centred at origin)
  const nz = pt.z / len;
  const dist = outerRadius(state) * 0.7 + 14;
  return {
    position: [pt.x + nx * dist, 13, pt.z + nz * dist],
    target: [pt.x * 0.6, 1.4, pt.z * 0.6],
    smoothTime: 0.75,
  };
}

/** Chase cam just behind the leader. */
function leader(state: RaceState): CameraShot {
  const u = frontU(state);
  const pt = pointAtU(STADIUM, MID_LANE(state), u);
  const fx = Math.sin(pt.heading);
  const fz = Math.cos(pt.heading);
  return {
    position: [pt.x - fx * 12, 6.5, pt.z - fz * 12],
    target: [pt.x + fx * 5, 1.3, pt.z + fz * 5],
    smoothTime: 0.5,
  };
}

function trackside(state: RaceState): CameraShot {
  const r = laneRadius(STADIUM, 0);
  return { position: [0, 6, -(outerRadius(state) + 18)], target: [0, 1.5, -r], smoothTime: 0.7 };
}

function startLine(): CameraShot {
  const p = pointAtU(STADIUM, 0, 0);
  return { position: [p.x - 7, 3.2, p.z - 9], target: [p.x + 8, 1.4, p.z + 3], smoothTime: 0.7 };
}

/**
 * Tight close-up on the winner as they cheer. Framed as a 3/4 front shot with
 * the winner biased to the LEFT of frame (so the result panel, docked right,
 * never covers them).
 */
function winnerCloseup(state: RaceState): CameraShot {
  const winnerId = raceRanking(state)[0];
  const r = state.runners.find((x) => x.id === winnerId) ?? state.runners[0]!;
  const u = r.prevPosition + (r.position - r.prevPosition) * state.alpha;
  const pt = pointAtU(STADIUM, r.lane, u);
  const fx = Math.sin(pt.heading);
  const fz = Math.cos(pt.heading);

  // Camera close, ahead of and to one side of the winner (tight 3/4 view).
  const px = pt.x + fx * 4.1 + fz * 2.0;
  const pz = pt.z + fz * 4.1 - fx * 2.0;
  const P: [number, number, number] = [px, 2.6, pz];

  // Look direction, then its screen-right = normalize(cross(forward, up)).
  let dx = pt.x - px;
  let dz = pt.z - pz;
  const dl = Math.hypot(dx, dz) || 1;
  dx /= dl;
  dz /= dl;
  const rx = -dz; // cross(forward, up) in XZ
  const rz = dx;

  // Shift the aim slightly toward screen-right → the winner sits a touch left of
  // centre (clear of the result panel on the right) but stays the clear subject.
  const bias = 1.5;
  const T: [number, number, number] = [pt.x + rx * bias, 1.45, pt.z + rz * bias];
  return { position: P, target: T, smoothTime: 0.9 };
}

export const raceCamera: CameraDirector<RaceState> = {
  getShot({ state, phase }): CameraShot {
    switch (phase) {
      case 'setup':
        return overview(state);
      case 'countdown':
        return startLine();
      case 'running':
        return broadcast(state);
      case 'result':
        return winnerCloseup(state);
    }
  },
  namedShots(state) {
    return {
      overview: overview(state),
      broadcast: broadcast(state),
      leader: leader(state),
      trackside: trackside(state),
    } satisfies Record<string, CameraShot>;
  },
};
