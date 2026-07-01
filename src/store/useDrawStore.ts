'use client';

/**
 * The single source of truth shared between the DOM UI and the 3D scene.
 *
 * Holds only DISCRETE state (participants, seed, active mode, phase, result,
 * the live mode-state handle, camera selection). Per-frame simulation values
 * live inside the mode state object and are mutated outside React — they are
 * never stored here, so the UI doesn't re-render 60×/second.
 */
import { create } from 'zustand';
import type { Participant, DrawResult, DrawPhase } from '@/lib/types';
import { MAX_PARTICIPANTS } from '@/lib/types';
import { drawResult } from '@/core/lottery/draw';
import { getMode, hasMode } from '@/core/mode/registry';

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Math.floor(Math.random() * 1e9).toString(36)}-${Date.now().toString(36)}`;
}

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function reindex(list: Participant[]): Participant[] {
  return list.map((p, i) => ({ ...p, lane: i }));
}

function sameOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

const DEFAULT_NAMES = ['小明', '小華', '小美', '阿強', '曉琪'];

function defaultParticipants(): Participant[] {
  return reindex(DEFAULT_NAMES.map((name) => ({ id: uid(), name, lane: 0 })));
}

export interface DrawStore {
  participants: Participant[];
  seed: string;
  activeModeId: string;
  phase: DrawPhase;
  result: DrawResult | null;
  /** Live mode simulation state; opaque to the store (mutated outside React). */
  state: unknown | null;
  /** Final finishing order once resolved (for the result overlay). */
  ranking: string[] | null;
  /** Countdown value while phase === 'countdown' (3 → 1), else null. */
  countdown: number | null;
  /** Selected named camera shot, or null for the mode's automatic direction. */
  cameraShotKey: string | null;
  /** True while the race is paused mid-run (freezes the whole render loop). */
  paused: boolean;
  /** Finishing order of the previous race, so each new draw is guaranteed different. */
  lastRanking: string[] | null;
  /** Scene time of day. */
  timeOfDay: 'day' | 'night';

  // participant editing
  addParticipant: (name?: string) => void;
  removeParticipant: (id: string) => void;
  renameParticipant: (id: string, name: string) => void;
  clearParticipants: () => void;

  // config
  setSeed: (seed: string) => void;
  randomizeSeed: () => void;
  setMode: (id: string) => void;

  // draw lifecycle
  rebuildPreview: () => void;
  /** Start a brand-new race: auto-picks a fresh seed, guaranteed to differ from
   *  the previous result. Used by both the Start button and "draw again". */
  start: () => void;
  tickCountdown: () => void;
  finish: (ranking: string[]) => void;
  reset: () => void;
  /** Alias of {@link start} — draw again with a new (different) outcome. */
  replay: () => void;
  togglePause: () => void;
  toggleTimeOfDay: () => void;

  // camera
  setCameraShot: (key: string | null) => void;
}

/** Begin a fresh race with an auto seed whose order differs from `lastRanking`. */
function beginFreshRace(
  get: () => DrawStore,
  set: (partial: Partial<DrawStore>) => void,
): void {
  const { participants, activeModeId, lastRanking } = get();
  if (participants.length < 2 || !hasMode(activeModeId)) return;

  let seed = randomSeed();
  let run = buildRun(participants, seed, activeModeId);
  let tries = 0;
  // Re-roll until the finishing order differs from the previous race.
  while (lastRanking && sameOrder(run.result.rankedIds, lastRanking) && tries < 40) {
    seed = randomSeed();
    run = buildRun(participants, seed, activeModeId);
    tries++;
  }

  set({
    seed,
    result: run.result,
    state: run.state,
    ranking: null,
    phase: 'countdown',
    countdown: 3,
    paused: false,
    cameraShotKey: null,
  });
}

/** Build the fair result + live mode state for the current inputs. */
function buildRun(participants: Participant[], seed: string, modeId: string) {
  const mode = getMode(modeId);
  const laned = reindex(participants).slice(0, mode.maxParticipants);
  const result = drawResult(laned, seed);
  const state = mode.createState({ participants: laned, result, seed });
  return { result, state, participants: laned };
}

export const useDrawStore = create<DrawStore>((set, get) => ({
  participants: defaultParticipants(),
  seed: 'LUCKY',
  activeModeId: 'race',
  phase: 'setup',
  result: null,
  state: null,
  ranking: null,
  countdown: null,
  cameraShotKey: null,
  paused: false,
  lastRanking: null,
  timeOfDay: 'day',

  addParticipant: (name) => {
    const { participants, phase } = get();
    if (participants.length >= MAX_PARTICIPANTS || phase !== 'setup') return;
    const next = reindex([
      ...participants,
      { id: uid(), name: name?.trim() || `選手 ${participants.length + 1}`, lane: 0 },
    ]);
    set({ participants: next });
    get().rebuildPreview();
  },

  removeParticipant: (id) => {
    const { participants, phase } = get();
    if (phase !== 'setup') return;
    set({ participants: reindex(participants.filter((p) => p.id !== id)) });
    get().rebuildPreview();
  },

  renameParticipant: (id, name) => {
    set({
      participants: get().participants.map((p) => (p.id === id ? { ...p, name } : p)),
    });
  },

  clearParticipants: () => {
    if (get().phase !== 'setup') return;
    set({ participants: [] });
    get().rebuildPreview();
  },

  setSeed: (seed) => {
    set({ seed });
    if (get().phase === 'setup') get().rebuildPreview();
  },

  randomizeSeed: () => {
    set({ seed: randomSeed() });
    if (get().phase === 'setup') get().rebuildPreview();
  },

  setMode: (id) => {
    if (!hasMode(id)) return;
    set({ activeModeId: id, cameraShotKey: null });
    if (get().phase === 'setup') get().rebuildPreview();
  },

  rebuildPreview: () => {
    const { participants, seed, activeModeId, phase } = get();
    if (phase !== 'setup' || participants.length === 0 || !hasMode(activeModeId)) {
      set({ result: null, state: null });
      return;
    }
    const run = buildRun(participants, seed, activeModeId);
    set({ result: run.result, state: run.state, ranking: null });
  },

  start: () => beginFreshRace(get, set),

  tickCountdown: () => {
    const { countdown, phase } = get();
    if (phase !== 'countdown') return;
    if (countdown && countdown > 1) set({ countdown: countdown - 1 });
    else set({ countdown: null, phase: 'running' });
  },

  finish: (ranking) => {
    if (get().phase !== 'running') return;
    set({ phase: 'result', ranking, cameraShotKey: null, paused: false, lastRanking: ranking });
  },

  reset: () => {
    const { participants, seed, activeModeId } = get();
    set({ phase: 'setup', ranking: null, countdown: null, cameraShotKey: null, paused: false });
    if (hasMode(activeModeId) && participants.length > 0) {
      const run = buildRun(participants, seed, activeModeId);
      set({ result: run.result, state: run.state });
    } else {
      set({ result: null, state: null });
    }
  },

  replay: () => beginFreshRace(get, set),

  togglePause: () => {
    if (get().phase === 'running') set({ paused: !get().paused });
  },

  toggleTimeOfDay: () => set({ timeOfDay: get().timeOfDay === 'day' ? 'night' : 'day' }),

  setCameraShot: (key) => set({ cameraShotKey: key }),
}));
