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
  start: () => void;
  tickCountdown: () => void;
  finish: (ranking: string[]) => void;
  reset: () => void;
  replay: () => void;

  // camera
  setCameraShot: (key: string | null) => void;
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

  start: () => {
    const { participants, seed, activeModeId, phase } = get();
    if (phase !== 'setup' || participants.length < 2 || !hasMode(activeModeId)) return;
    const run = buildRun(participants, seed, activeModeId);
    set({ result: run.result, state: run.state, ranking: null, phase: 'countdown', countdown: 3 });
  },

  tickCountdown: () => {
    const { countdown, phase } = get();
    if (phase !== 'countdown') return;
    if (countdown && countdown > 1) set({ countdown: countdown - 1 });
    else set({ countdown: null, phase: 'running' });
  },

  finish: (ranking) => {
    if (get().phase !== 'running') return;
    set({ phase: 'result', ranking, cameraShotKey: null });
  },

  reset: () => {
    const { participants, seed, activeModeId } = get();
    set({ phase: 'setup', ranking: null, countdown: null, cameraShotKey: null });
    if (hasMode(activeModeId) && participants.length > 0) {
      const run = buildRun(participants, seed, activeModeId);
      set({ result: run.result, state: run.state });
    } else {
      set({ result: null, state: null });
    }
  },

  replay: () => {
    const { participants, seed, activeModeId } = get();
    if (!hasMode(activeModeId) || participants.length < 2) return;
    const run = buildRun(participants, seed, activeModeId);
    set({ result: run.result, state: run.state, ranking: null, phase: 'countdown', countdown: 3 });
  },

  setCameraShot: (key) => set({ cameraShotKey: key }),
}));
