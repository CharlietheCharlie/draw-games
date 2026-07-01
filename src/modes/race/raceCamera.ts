/**
 * Camera director for the race: named angles the user can cycle, plus automatic
 * shots per phase — an establishing overview, a start-line angle, a leader-
 * following broadcast shot while running, and an auto podium framing of the top
 * three finishers on the result phase. Pure (returns plain tuples).
 */
import type { CameraDirector, CameraShot } from '@/core/mode/CameraDirector';
import { laneRadius, pointAtU, trackExtent } from '@/core/geometry/stadium';
import { STADIUM } from './raceTuning';
import { raceRanking, type RaceState } from './raceState';

function outerRadius(state: RaceState): number {
  return laneRadius(STADIUM, state.displayLanes - 1) + STADIUM.laneWidth;
}

function overview(state: RaceState): CameraShot {
  const ext = trackExtent(STADIUM.straight, outerRadius(state));
  const d = Math.max(ext.x, ext.z);
  return { position: [0, d * 1.2, d * 1.55], target: [0, 1.5, 0], smoothTime: 0.85 };
}

function leader(state: RaceState): CameraShot {
  const lead = state.runners.reduce((a, b) => (b.position > a.position ? b : a), state.runners[0]!);
  const pt = pointAtU(STADIUM, lead.lane, lead.position);
  const fx = Math.sin(pt.heading);
  const fz = Math.cos(pt.heading);
  return {
    position: [pt.x - fx * 11, 6.5, pt.z - fz * 11],
    target: [pt.x + fx * 4, 1.3, pt.z + fz * 4],
    smoothTime: 0.4,
  };
}

function trackside(state: RaceState): CameraShot {
  const r = laneRadius(STADIUM, 0);
  return {
    position: [0, 5.5, -(outerRadius(state) + 16)],
    target: [0, 1.5, -r],
    smoothTime: 0.6,
  };
}

function startLine(): CameraShot {
  const p = pointAtU(STADIUM, 0, 0);
  return {
    position: [p.x - 7, 3.2, p.z - 9],
    target: [p.x + 8, 1.4, p.z + 3],
    smoothTime: 0.6,
  };
}

function podium(state: RaceState): CameraShot {
  const top = raceRanking(state).slice(0, 3);
  const pts = top.map((id) => {
    const r = state.runners.find((x) => x.id === id)!;
    return pointAtU(STADIUM, r.lane, r.position);
  });
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cz = pts.reduce((s, p) => s + p.z, 0) / pts.length;
  // Finishers coast onto the front straight (heading ≈ +X); frame them from
  // ahead and to the side, slightly above.
  return { position: [cx + 11, 5.5, cz - 9], target: [cx, 1.3, cz], smoothTime: 0.9 };
}

export const raceCamera: CameraDirector<RaceState> = {
  getShot({ state, phase }): CameraShot {
    switch (phase) {
      case 'setup':
        return overview(state);
      case 'countdown':
        return startLine();
      case 'running':
        return leader(state);
      case 'result':
        return podium(state);
    }
  },
  namedShots(state) {
    return {
      overview: overview(state),
      leader: leader(state),
      trackside: trackside(state),
    } satisfies Record<string, CameraShot>;
  },
};
