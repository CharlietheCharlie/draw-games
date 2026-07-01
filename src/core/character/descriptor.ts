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
import { SKIN, HAIR, OUTFIT, ACCESSORY_COLOR } from './palettes';

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
 */
export function generateAvatar(participantId: string, seed: string): AvatarDescriptor {
  const rnd: Rng = deriveStream(seed, STREAM.avatar(participantId));

  const gender: Gender = rnd() < 0.5 ? 'male' : 'female';
  const female = gender === 'female';

  return {
    gender,
    skin: pick(rnd, SKIN),
    hairColor: pick(rnd, HAIR),
    // Hair style is gender-gated so the silhouette makes gender legible.
    hairStyle: female ? pick(rnd, FEMALE_HAIR) : pick(rnd, MALE_HAIR),
    accessoryColor: pick(rnd, ACCESSORY_COLOR),
    top: pick(rnd, OUTFIT),
    bottom: pick(rnd, OUTFIT),
    // Bias toward "none" so accessories stay special (2/5 chance of an accessory).
    accessory: pick(rnd, ['none', 'none', 'none', 'headband', 'cap', 'glasses'] as const),
    expression: pick(rnd, ['happy', 'happy', 'cool', 'determined', 'sweet'] as const),
    skirt: female,
    // Female: narrower shoulders + slightly shorter; male: broader shoulders.
    bodyScale: female ? [0.82, 0.97, 0.9] : [1.08, 1.0, 1.0],
  };
}
