'use client';

/**
 * COPY-ME TEMPLATE for a new draw mechanism.
 *
 * A game mode is anything that animates toward a pre-decided fair result. This
 * minimal example resolves instantly (no visuals) and exists purely as a
 * compiling starting point — copy this folder to `modes/roulette` (or
 * `modes/ladder`), flesh out the state/step/Scene/camera, then register it in
 * `modes/registerAll.ts`. See `docs/ADDING_A_MODE.md` for the full walkthrough.
 *
 * It is intentionally NOT registered.
 */
import type { GameMode, CreateStateArgs } from '@/core/mode/GameMode';
import type { CameraDirector } from '@/core/mode/CameraDirector';

interface TemplateState {
  rankedIds: string[];
  t: number;
}

function createState({ result }: CreateStateArgs): TemplateState {
  // NOTE: never re-randomize — the fair order is already decided. Animate to it.
  return { rankedIds: result.rankedIds, t: 0 };
}

function step(state: TemplateState, fixedDtSec: number): void {
  state.t = Math.min(1, state.t + fixedDtSec / 2); // ~2s reveal
}

function isFinished(state: TemplateState): boolean {
  return state.t >= 1;
}

function getRanking(state: TemplateState): string[] {
  return state.rankedIds;
}

// Render your 3D scene here (reuse <Avatar/> from '@/render/Avatar' for characters).
// A component may ignore its props and still satisfy ComponentType<ModeSceneProps>.
function TemplateScene() {
  return null;
}

const camera: CameraDirector<TemplateState> = {
  getShot() {
    return { position: [0, 20, 30], target: [0, 0, 0], smoothTime: 0.6 };
  },
  namedShots() {
    return { overview: { position: [0, 20, 30], target: [0, 0, 0] } };
  },
};

export const templateMode: GameMode<TemplateState> = {
  id: 'template',
  label: '範本 · Template',
  maxParticipants: 12,
  createState,
  step,
  isFinished,
  getRanking,
  Scene: TemplateScene,
  camera,
};
