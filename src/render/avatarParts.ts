/**
 * Pure geometry description of a rounded, cel-shaded avatar built from cubes.
 *
 * `buildAvatar(descriptor)` returns the static cubes (torso, head, hair, outfit,
 * face, accessories) plus the *segmented* limb dimensions and pivot heights the
 * animated <Avatar/> uses for a natural, jointed run cycle (thigh+shin,
 * upper-arm+forearm). No three.js here — just numbers — so proportions are easy
 * to reason about and unit-test.
 *
 * Coordinate frame: avatar stands on y = 0, faces local +Z (its running
 * direction), x is left/right. Dimensions are "metres" (avatar ≈ 1.9 tall).
 */
import type { AvatarDescriptor, Expression } from '@/core/character/descriptor';

export interface Cube {
  pos: [number, number, number];
  size: [number, number, number];
  color: string;
  /** Sharp box (face detail) instead of the default rounded body cube. */
  sharp?: boolean;
  /** Optional local rotation (used for tilted eyebrows / mouth). */
  rot?: [number, number, number];
}

export interface Segment {
  len: number;
  w: number;
  d: number;
  color: string;
}

export interface AvatarBuild {
  totalHeight: number;
  hipY: number;
  shoulderY: number;
  legSpacingX: number;
  armX: number;
  thigh: Segment;
  shin: Segment;
  foot: { len: number; w: number; h: number; color: string };
  upperArm: Segment;
  foreArm: Segment;
  staticCubes: Cube[];
}

const EYE_WHITE = '#fbfbff';
const PUPIL = '#232733';
const MOUTH = '#8a3f38';
const BLUSH = '#ff9aa2';

export function buildAvatar(d: AvatarDescriptor): AvatarBuild {
  const sx = d.bodyScale[0];

  const thigh: Segment = { len: 0.34, w: 0.2, d: 0.22, color: d.bottom };
  const shin: Segment = { len: 0.34, w: 0.18, d: 0.2, color: d.skin };
  const foot = { len: 0.28, w: 0.2, h: 0.12, color: '#3a3a44' };
  const hipY = thigh.len + shin.len;
  const legSpacingX = 0.15;

  const torsoW = 0.56 * sx;
  const torsoH = 0.58;
  const torsoD = 0.32;
  const torsoY = hipY + torsoH / 2;
  const shoulderY = hipY + torsoH;

  const upperArm: Segment = { len: 0.3, w: 0.15, d: 0.16, color: d.top };
  const foreArm: Segment = { len: 0.3, w: 0.13, d: 0.14, color: d.skin };
  const armX = torsoW / 2 + upperArm.w / 2;

  const headSize = 0.48;
  const headY = shoulderY + 0.06 + headSize / 2;
  const headTop = headY + headSize / 2;

  const cubes: Cube[] = [];

  // Torso (shirt) + a small neck.
  cubes.push({ pos: [0, torsoY, 0], size: [torsoW, torsoH, torsoD], color: d.top });
  cubes.push({ pos: [0, shoulderY + 0.03, 0], size: [0.18, 0.12, 0.18], color: d.skin });

  // Bottom: flared skirt (female) or shorts band (male) — a clear gender cue.
  if (d.skirt) {
    cubes.push({ pos: [0, hipY + 0.02, 0], size: [torsoW * 1.4 + 0.06, 0.32, torsoD * 1.3], color: d.bottom });
  } else {
    cubes.push({ pos: [0, hipY + 0.08, 0], size: [torsoW * 1.03, 0.28, torsoD * 1.05], color: d.bottom });
  }

  // Head.
  cubes.push({ pos: [0, headY, 0], size: [headSize, headSize, headSize], color: d.skin });

  addFace(cubes, d.expression, headY, headSize, d.hairColor);
  if (d.expression === 'sweet') {
    cubes.push({ pos: [-0.18, headY - 0.05, headSize / 2 - 0.02], size: [0.09, 0.06, 0.03], color: BLUSH, sharp: true });
    cubes.push({ pos: [0.18, headY - 0.05, headSize / 2 - 0.02], size: [0.09, 0.06, 0.03], color: BLUSH, sharp: true });
  }
  addHair(cubes, d, headY, headSize, headTop);
  addAccessory(cubes, d, headY, headSize, headTop);

  return {
    totalHeight: headTop + 0.24,
    hipY,
    shoulderY,
    legSpacingX,
    armX,
    thigh,
    shin,
    foot,
    upperArm,
    foreArm,
    staticCubes: cubes,
  };
}

function addFace(cubes: Cube[], expr: Expression, headY: number, hs: number, hairColor: string): void {
  const fz = hs / 2; // face plane
  const eyeX = 0.11;

  // Eyes: white base, dark pupil, tiny highlight.
  for (const sign of [-1, 1] as const) {
    cubes.push({ pos: [sign * eyeX, headY + 0.02, fz - 0.02], size: [0.11, 0.14, 0.05], color: EYE_WHITE, sharp: true });
    cubes.push({ pos: [sign * eyeX, headY + 0.0, fz + 0.02], size: [0.065, 0.1, 0.05], color: PUPIL, sharp: true });
    cubes.push({ pos: [sign * eyeX + 0.02, headY + 0.06, fz + 0.05], size: [0.03, 0.03, 0.02], color: '#ffffff', sharp: true });
  }

  // Eyebrows — tilt encodes the expression.
  const browTilt = expr === 'determined' ? -0.4 : expr === 'happy' ? 0.16 : expr === 'sweet' ? 0.1 : 0;
  for (const sign of [-1, 1] as const) {
    cubes.push({
      pos: [sign * eyeX, headY + 0.15, fz + 0.02],
      size: [0.14, 0.035, 0.04],
      color: hairColor,
      sharp: true,
      rot: [0, 0, sign * browTilt],
    });
  }

  // Mouth.
  const mouthW = expr === 'happy' ? 0.2 : expr === 'cool' ? 0.1 : 0.15;
  cubes.push({ pos: [0, headY - 0.13, fz + 0.01], size: [mouthW, 0.05, 0.03], color: MOUTH, sharp: true });
  if (expr === 'happy' || expr === 'sweet') {
    // Upturned corners → a smile.
    for (const sign of [-1, 1] as const) {
      cubes.push({ pos: [sign * (mouthW / 2), headY - 0.1, fz + 0.01], size: [0.05, 0.05, 0.03], color: MOUTH, sharp: true });
    }
  }
}

function addHair(cubes: Cube[], d: AvatarDescriptor, headY: number, hs: number, headTop: number): void {
  const cap: Cube = { pos: [0, headTop - 0.05, 0], size: [hs * 1.05, 0.15, hs * 1.05], color: d.hairColor };
  switch (d.hairStyle) {
    case 'buzz':
      cubes.push({ pos: [0, headTop - 0.03, 0], size: [hs * 1.02, 0.09, hs * 1.02], color: d.hairColor });
      break;
    case 'short':
      cubes.push(cap);
      break;
    case 'long':
      cubes.push(cap);
      cubes.push({ pos: [0, headY - 0.02, -(hs / 2 + 0.06)], size: [hs * 1.05, hs * 0.95, 0.14], color: d.hairColor });
      break;
    case 'ponytail':
      cubes.push(cap);
      cubes.push({ pos: [0, headY - 0.05, -(hs / 2 + 0.1)], size: [0.17, 0.44, 0.17], color: d.hairColor });
      break;
    case 'bun':
      cubes.push(cap);
      cubes.push({ pos: [0, headTop + 0.04, -0.06], size: [0.24, 0.24, 0.24], color: d.hairColor });
      break;
  }
}

function addAccessory(cubes: Cube[], d: AvatarDescriptor, headY: number, hs: number, headTop: number): void {
  switch (d.accessory) {
    case 'headband':
      cubes.push({ pos: [0, headY + 0.14, 0], size: [hs * 1.07, 0.1, hs * 1.07], color: d.accessoryColor });
      break;
    case 'cap':
      cubes.push({ pos: [0, headTop + 0.02, 0], size: [hs * 1.1, 0.15, hs * 1.1], color: d.accessoryColor });
      cubes.push({ pos: [0, headTop - 0.03, hs / 2 + 0.08], size: [hs * 0.9, 0.05, 0.22], color: d.accessoryColor });
      break;
    case 'glasses':
      cubes.push({ pos: [0, headY + 0.02, hs / 2 + 0.03], size: [hs * 0.95, 0.1, 0.04], color: '#101014', sharp: true });
      break;
    case 'none':
      break;
  }
}
