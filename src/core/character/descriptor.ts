/**
 * Procedural avatar generation — pure data, no three.js.
 *
 * `generateAvatar(id, seed)` deterministically turns a participant into an
 * {@link AvatarDescriptor}: a small bag of colours + style choices. The render
 * layer ({@link module:render/avatarParts}) turns that descriptor into cubes.
 * Keeping this pure means the same person looks identical in the race, on the
 * podium, and in any future roulette/ladder mode, and lets us unit-test the
 * generator (determinism, gender legibility) without a GPU.
 */
import type { Gender } from '@/lib/types';
import { deriveStream, STREAM } from '@/core/rng/hash';
import { pick, type Rng } from '@/core/rng/prng';
import { SKIN, HAIR, OUTFIT, ACCESSORY_COLOR, NEUTRALS } from './palettes';

/** Lighten (amt > 0, toward white) or darken (amt < 0, toward black) a #rrggbb colour. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => (amt >= 0 ? c + (255 - c) * amt : c * (1 + amt));
  const hx = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${hx(mix((n >> 16) & 255))}${hx(mix((n >> 8) & 255))}${hx(mix(n & 255))}`;
}

export type HairStyle = 'short' | 'buzz' | 'long' | 'ponytail' | 'bun';
export type Accessory = 'none' | 'headband' | 'cap' | 'glasses';
export type Expression = 'happy' | 'cool' | 'determined' | 'sweet';

export interface AvatarDescriptor {
  gender: Gender;
  skin: string;
  hairColor: string;
  hairStyle: HairStyle;
  accessoryColor: string;
  /** Shirt colour. */
  top: string;
  /** Shorts / skirt colour. */
  bottom: string;
  accessory: Accessory;
  /** Facial expression — gives each character a bit of personality. */
  expression: Expression;
  /** Female avatars render a skirt block instead of separated shorts. */
  skirt: boolean;
  /**
   * Non-uniform body scale [x, y, z] applied to the torso/shoulders so male and
   * female silhouettes read differently at a glance (broader vs. narrower).
   */
  bodyScale: [number, number, number];
}

const MALE_HAIR: readonly HairStyle[] = ['short', 'buzz', 'short'];
const FEMALE_HAIR: readonly HairStyle[] = ['long', 'ponytail', 'bun'];

/**
 * Deterministically generate an avatar for a participant.
 * Same `(participantId, seed)` always yields the same look.
 *
 * If `themeColor` is given (a participant's lane colour), the OUTFIT follows it:
 * the top is that colour with a light/dark variation, and the bottom is either a
 * darker shade of it or a neutral (grey/white/black) — while skin, hair, face
 * and expression stay purely random. The RNG draw order is unchanged, so those
 * random traits are identical whether or not a theme colour is supplied.
 */
export function generateAvatar(participantId: string, seed: string, themeColor?: string): AvatarDescriptor {
  const rnd: Rng = deriveStream(seed, STREAM.avatar(participantId));

  const gender: Gender = rnd() < 0.5 ? 'male' : 'female';
  const female = gender === 'female';

  const skin = pick(rnd, SKIN);
  const hairColor = pick(rnd, HAIR);
  // Hair style is gender-gated so the silhouette makes gender legible.
  const hairStyle = female ? pick(rnd, FEMALE_HAIR) : pick(rnd, MALE_HAIR);
  const accessoryColor = pick(rnd, ACCESSORY_COLOR);

  // Two draws for the outfit (kept identical to the old two OUTFIT picks).
  const topR = rnd();
  const bottomR = rnd();
  let top: string;
  let bottom: string;
  if (themeColor) {
    top = shade(themeColor, -0.08 + topR * 0.26); // lane colour, slight light/dark
    bottom =
      bottomR < 0.4
        ? NEUTRALS[Math.floor((bottomR / 0.4) * NEUTRALS.length)]! // grey/white/black
        : shade(themeColor, -0.42 + (bottomR - 0.4) * 0.3); // darker team colour
  } else {
    top = OUTFIT[Math.floor(topR * OUTFIT.length)]!;
    bottom = OUTFIT[Math.floor(bottomR * OUTFIT.length)]!;
  }

  return {
    gender,
    skin,
    hairColor,
    hairStyle,
    accessoryColor,
    top,
    bottom,
    // Bias toward "none" so accessories stay special (2/5 chance of an accessory).
    accessory: pick(rnd, ['none', 'none', 'none', 'headband', 'cap', 'glasses'] as const),
    expression: pick(rnd, ['happy', 'happy', 'cool', 'determined', 'sweet'] as const),
    skirt: female,
    // Female: narrower shoulders + slightly shorter; male: broader shoulders.
    bodyScale: female ? [0.82, 0.97, 0.9] : [1.08, 1.0, 1.0],
  };
}
