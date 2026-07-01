/**
 * Pure geometry description of a blocky avatar built from cubes.
 *
 * `buildAvatar(descriptor)` turns an {@link AvatarDescriptor} into concrete cube
 * placements (torso, head, hair, outfit, accessories) plus the limb sizes and
 * pivot heights the animated <Avatar/> uses. No three.js here — just numbers —
 * so proportions are easy to reason about and unit-test.
 *
 * Coordinate frame: avatar stands on y = 0, faces local +Z (its running
 * direction), x is left/right. Dimensions are in "metres" (avatar ≈ 1.8 tall).
 */
import type { AvatarDescriptor } from '@/core/character/descriptor';

export interface Cube {
  pos: [number, number, number];
  size: [number, number, number];
  color: string;
}

export interface LimbSpec {
  size: [number, number, number];
  color: string;
}

export interface AvatarBuild {
  totalHeight: number;
  /** Hip pivot height (top of the legs). */
  hipY: number;
  /** Shoulder pivot height (top of the torso). */
  shoulderY: number;
  /** Half-distance between the two legs. */
  legSpacingX: number;
  /** Distance from centre to each shoulder pivot. */
  armX: number;
  leg: LimbSpec;
  arm: LimbSpec;
  /** Non-animated cubes, positioned in avatar-local space. */
  staticCubes: Cube[];
}

const EYE_COLOR = '#161616';
const GLASS_COLOR = '#101014';

export function buildAvatar(d: AvatarDescriptor): AvatarBuild {
  const sx = d.bodyScale[0];

  const legLen = 0.68;
  const legW = 0.2;
  const legD = 0.24;
  const legSpacingX = 0.14;
  const hipY = legLen;

  const torsoW = 0.56 * sx;
  const torsoH = 0.64;
  const torsoD = 0.32;
  const torsoY = hipY + torsoH / 2;
  const shoulderY = hipY + torsoH;

  const armLen = 0.6;
  const armW = 0.15;
  const armD = 0.17;
  const armX = torsoW / 2 + armW / 2;

  const headSize = 0.44;
  const headY = shoulderY + headSize / 2;
  const headTop = headY + headSize / 2;

  const cubes: Cube[] = [];

  // Torso (shirt).
  cubes.push({ pos: [0, torsoY, 0], size: [torsoW, torsoH, torsoD], color: d.top });

  // Bottom: flared skirt (female) or shorts (male) — a clear gender cue.
  if (d.skirt) {
    cubes.push({ pos: [0, hipY + 0.02, 0], size: [torsoW * 1.35 + 0.06, 0.34, torsoD * 1.28], color: d.bottom });
  } else {
    cubes.push({ pos: [0, hipY + 0.07, 0], size: [torsoW * 1.02, 0.3, torsoD * 1.04], color: d.bottom });
  }

  // Head.
  cubes.push({ pos: [0, headY, 0], size: [headSize, headSize, headSize], color: d.skin });

  // Eyes (Pokémon-ish charm).
  const faceZ = headSize / 2 + 0.01;
  cubes.push({ pos: [-0.1, headY + 0.02, faceZ], size: [0.07, 0.07, 0.03], color: EYE_COLOR });
  cubes.push({ pos: [0.1, headY + 0.02, faceZ], size: [0.07, 0.07, 0.03], color: EYE_COLOR });

  addHair(cubes, d, headY, headSize, headTop);
  addAccessory(cubes, d, headY, headSize, headTop, faceZ);

  return {
    totalHeight: headTop + 0.22,
    hipY,
    shoulderY,
    legSpacingX,
    armX,
    leg: { size: [legW, legLen, legD], color: d.skin },
    arm: { size: [armW, armLen, armD], color: d.skin },
    staticCubes: cubes,
  };
}

function addHair(cubes: Cube[], d: AvatarDescriptor, headY: number, hs: number, headTop: number): void {
  const cap: Cube = { pos: [0, headTop - 0.05, 0], size: [hs * 1.04, 0.14, hs * 1.04], color: d.hairColor };
  switch (d.hairStyle) {
    case 'buzz':
      cubes.push({ pos: [0, headTop - 0.03, 0], size: [hs * 1.02, 0.08, hs * 1.02], color: d.hairColor });
      break;
    case 'short':
      cubes.push(cap);
      break;
    case 'long':
      cubes.push(cap);
      cubes.push({ pos: [0, headY - 0.02, -(hs / 2 + 0.06)], size: [hs * 1.04, hs * 0.95, 0.12], color: d.hairColor });
      break;
    case 'ponytail':
      cubes.push(cap);
      cubes.push({ pos: [0, headY - 0.05, -(hs / 2 + 0.1)], size: [0.16, 0.42, 0.16], color: d.hairColor });
      break;
    case 'bun':
      cubes.push(cap);
      cubes.push({ pos: [0, headTop + 0.03, -0.06], size: [0.22, 0.22, 0.22], color: d.hairColor });
      break;
  }
}

function addAccessory(
  cubes: Cube[],
  d: AvatarDescriptor,
  headY: number,
  hs: number,
  headTop: number,
  faceZ: number,
): void {
  switch (d.accessory) {
    case 'headband':
      cubes.push({ pos: [0, headY + 0.12, 0], size: [hs * 1.06, 0.09, hs * 1.06], color: d.accessoryColor });
      break;
    case 'cap':
      cubes.push({ pos: [0, headTop + 0.01, 0], size: [hs * 1.08, 0.14, hs * 1.08], color: d.accessoryColor });
      cubes.push({ pos: [0, headTop - 0.03, hs / 2 + 0.06], size: [hs * 0.9, 0.05, 0.2], color: d.accessoryColor });
      break;
    case 'glasses':
      cubes.push({ pos: [0, headY + 0.02, faceZ + 0.02], size: [hs * 0.92, 0.09, 0.04], color: GLASS_COLOR });
      break;
    case 'none':
      break;
  }
}
