/**
 * Curated colour palettes for procedural avatars.
 *
 * Kept small and hand-picked so any random combination still looks pleasant and
 * the 12 runners stay visually distinguishable from each other.
 */

/** Skin tones (blocky characters read best with a small, warm range). */
export const SKIN = [
  '#f2c9a0', '#e0ac82', '#c68642', '#a56a3a', '#8d5524', '#5c3a21',
] as const;

/** Hair colours. */
export const HAIR = [
  '#2b2118', '#4a2f1b', '#7a4a1e', '#b06a2c', '#d8b25a',
  '#111111', '#6b6b6b', '#c0392b', '#2c3e6b', '#8e44ad',
] as const;

/** Outfit colours (tops and bottoms draw from the same lively set). */
export const OUTFIT = [
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c',
  '#3498db', '#9b59b6', '#34495e', '#e91e63', '#16a085',
  '#d35400', '#27ae60', '#2980b9', '#8e44ad', '#c0392b',
] as const;

/** Accessory colours. */
export const ACCESSORY_COLOR = [
  '#ffffff', '#111111', '#e74c3c', '#f1c40f', '#3498db', '#2ecc71',
] as const;

/** Neutral tones (grey / white / black) used to pair with a themed outfit. */
export const NEUTRALS = ['#f4f5f7', '#d3d6dc', '#9298a2', '#5b606a', '#2c2f36'] as const;

/** Lane colours — assigned by lane index so each runner's lane reads clearly. */
export const LANE_COLORS = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4',
  '#42d4f4', '#f032e6', '#bfef45', '#fabed4', '#469990', '#dcbeff',
] as const;
