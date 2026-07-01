/**
 * Pure stadium-track geometry (no three.js).
 *
 * The track is a classic "stadium" loop: two straights joined by two semicircle
 * bends, lying flat in the X–Z plane, centred at the origin and traversed
 * counter-clockwise. A single normalized parameter `u` walks one lap by
 * arc length ([0,1) = one lap; values outside wrap), which the race sim maps
 * runner progress onto and the camera/track mesh reuse for exact placement.
 */

export interface StadiumDims {
  /** Length of each straight. */
  straight: number;
  /** Centreline radius of the innermost lane (lane 0). */
  radius: number;
  /** Distance between adjacent lane centrelines. */
  laneWidth: number;
}

export interface TrackPoint {
  x: number;
  z: number;
  /** Yaw (radians) so an object facing local +Z faces the travel direction. */
  heading: number;
}

/** Centreline radius of a given lane. */
export function laneRadius(dims: StadiumDims, lane: number): number {
  return dims.radius + lane * dims.laneWidth;
}

/** Total path length of a loop at the given straight length and radius. */
export function pathLength(straight: number, radius: number): number {
  return 2 * straight + 2 * Math.PI * radius;
}

/** Full lap length for a lane. */
export function laneLength(dims: StadiumDims, lane: number): number {
  return pathLength(dims.straight, laneRadius(dims, lane));
}

/**
 * Point + heading at parameter `u` along a loop of the given straight/radius.
 * Core routine; lane helpers below wrap it. `u` wraps so overrun past the
 * finish line (u slightly > 1) lands just past the start on the front straight.
 */
export function pathPoint(straight: number, radius: number, u: number): TrackPoint {
  const S = straight;
  const R = radius;
  const total = pathLength(S, R);
  const bend = Math.PI * R;

  // Distance travelled this lap.
  let d = (u - Math.floor(u)) * total;

  // Segment 1: front straight, +X, at z = -R.
  if (d <= S) {
    return { x: -S / 2 + d, z: -R, heading: Math.atan2(1, 0) };
  }
  d -= S;

  // Segment 2: right bend, centre (+S/2, 0), theta from -pi/2 to +pi/2.
  if (d <= bend) {
    const theta = -Math.PI / 2 + d / R;
    return {
      x: S / 2 + R * Math.cos(theta),
      z: R * Math.sin(theta),
      heading: Math.atan2(-Math.sin(theta), Math.cos(theta)),
    };
  }
  d -= bend;

  // Segment 3: back straight, -X, at z = +R.
  if (d <= S) {
    return { x: S / 2 - d, z: R, heading: Math.atan2(-1, 0) };
  }
  d -= S;

  // Segment 4: left bend, centre (-S/2, 0), theta from +pi/2 to +3pi/2.
  const theta = Math.PI / 2 + d / R;
  return {
    x: -S / 2 + R * Math.cos(theta),
    z: R * Math.sin(theta),
    heading: Math.atan2(-Math.sin(theta), Math.cos(theta)),
  };
}

/** Point + heading for a runner in `lane` at lap parameter `u`. */
export function pointAtU(dims: StadiumDims, lane: number, u: number): TrackPoint {
  return pathPoint(dims.straight, laneRadius(dims, lane), u);
}

/**
 * Sampled outline of a loop at an arbitrary radius — used to build the track
 * surface shape and paint lane lines. Returns [x, z] pairs, not closed.
 */
export function outlinePoints(
  straight: number,
  radius: number,
  segments = 96,
): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < segments; i++) {
    const p = pathPoint(straight, radius, i / segments);
    pts.push([p.x, p.z]);
  }
  return pts;
}

/** Half-extents (x, z) of the whole track footprint out to `outerRadius`. */
export function trackExtent(straight: number, outerRadius: number): { x: number; z: number } {
  return { x: straight / 2 + outerRadius, z: outerRadius };
}
