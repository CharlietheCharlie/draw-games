import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { useDrawStore } from './useDrawStore';
import { registerMode, hasMode } from '@/core/mode/registry';
import type { AnyGameMode } from '@/core/mode/GameMode';
import { MAX_PARTICIPANTS } from '@/lib/types';

// Register a lightweight stand-in for the 'race' mode so the store's buildRun /
// getMode calls resolve without pulling the whole three.js / R3F scene into the
// node test environment. The store treats mode state as opaque, so an empty
// object is enough — only `maxParticipants` and a real `drawResult` matter.
beforeAll(() => {
  if (!hasMode('race')) {
    registerMode({
      id: 'race',
      label: 'Race (test)',
      maxParticipants: MAX_PARTICIPANTS,
      createState: () => ({}),
      step: () => {},
      isFinished: () => true,
      getRanking: () => [],
      Scene: () => null,
      camera: {} as AnyGameMode['camera'],
    });
  }
});

const store = useDrawStore;
const initial = useDrawStore.getInitialState();

beforeEach(() => {
  // Full reset to the store's initial state before every test.
  store.setState(initial, true);
});

/** Drive countdown → running so `finish` is reachable. */
function toRunning() {
  store.getState().start();
  store.getState().tickCountdown();
  store.getState().tickCountdown();
  store.getState().tickCountdown();
}

describe('useDrawStore — defaults', () => {
  it('starts in setup with the default roster on the race mode', () => {
    const s = store.getState();
    expect(s.phase).toBe('setup');
    expect(s.activeModeId).toBe('race');
    expect(s.participants.length).toBe(5);
    expect(s.participants.map((p) => p.lane)).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('useDrawStore — participant editing', () => {
  it('adds a participant and re-lanes sequentially', () => {
    store.getState().addParticipant('新人');
    const ps = store.getState().participants;
    expect(ps.length).toBe(6);
    expect(ps[5]!.name).toBe('新人');
    expect(ps.map((p) => p.lane)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('caps the roster at MAX_PARTICIPANTS', () => {
    const add = store.getState().addParticipant;
    while (store.getState().participants.length < MAX_PARTICIPANTS) add();
    expect(store.getState().participants.length).toBe(MAX_PARTICIPANTS);
    add(); // one over the cap
    expect(store.getState().participants.length).toBe(MAX_PARTICIPANTS);
  });

  it('removes a participant and re-lanes the remainder', () => {
    const target = store.getState().participants[2]!;
    store.getState().removeParticipant(target.id);
    const ps = store.getState().participants;
    expect(ps.length).toBe(4);
    expect(ps.find((p) => p.id === target.id)).toBeUndefined();
    expect(ps.map((p) => p.lane)).toEqual([0, 1, 2, 3]);
  });

  it('renames in place without touching ids or lanes', () => {
    const target = store.getState().participants[1]!;
    store.getState().renameParticipant(target.id, '改名');
    const after = store.getState().participants[1]!;
    expect(after.id).toBe(target.id);
    expect(after.name).toBe('改名');
    expect(after.lane).toBe(1);
  });

  it('clears the roster', () => {
    store.getState().clearParticipants();
    expect(store.getState().participants).toEqual([]);
    expect(store.getState().result).toBeNull();
  });

  it('ignores edits once the draw has left setup', () => {
    toRunning();
    expect(store.getState().phase).toBe('running');
    const before = store.getState().participants.length;
    store.getState().addParticipant('太晚');
    store.getState().removeParticipant(store.getState().participants[0]!.id);
    expect(store.getState().participants.length).toBe(before);
  });
});

describe('useDrawStore — draw lifecycle', () => {
  it('start() enters countdown with a resolved result', () => {
    store.getState().start();
    const s = store.getState();
    expect(s.phase).toBe('countdown');
    expect(s.countdown).toBe(3);
    expect(s.result).not.toBeNull();
    expect(s.result!.rankedIds.length).toBe(5);
    expect(s.state).not.toBeNull();
  });

  it('start() is a no-op with fewer than two participants', () => {
    const only = store.getState().participants.slice(0, 4).map((p) => p.id);
    only.forEach((id) => store.getState().removeParticipant(id)); // leaves 1
    store.getState().start();
    expect(store.getState().phase).toBe('setup');
  });

  it('tickCountdown counts 3 → 2 → 1 → running', () => {
    store.getState().start();
    store.getState().tickCountdown();
    expect(store.getState().countdown).toBe(2);
    store.getState().tickCountdown();
    expect(store.getState().countdown).toBe(1);
    store.getState().tickCountdown();
    expect(store.getState().countdown).toBeNull();
    expect(store.getState().phase).toBe('running');
  });

  it('finish() records the ranking and moves to result (only while running)', () => {
    toRunning();
    const order = store.getState().result!.rankedIds;
    store.getState().finish(order);
    const s = store.getState();
    expect(s.phase).toBe('result');
    expect(s.ranking).toEqual(order);
    expect(s.lastRanking).toEqual(order);
  });

  it('finish() is ignored when not running', () => {
    store.getState().finish(['p0']);
    expect(store.getState().phase).toBe('setup');
    expect(store.getState().ranking).toBeNull();
  });

  it('reset() returns to setup and rebuilds a preview', () => {
    toRunning();
    store.getState().reset();
    const s = store.getState();
    expect(s.phase).toBe('setup');
    expect(s.ranking).toBeNull();
    expect(s.countdown).toBeNull();
    expect(s.result).not.toBeNull(); // preview rebuilt from the current roster
  });

  it('a fresh draw is guaranteed to differ from the previous finishing order', () => {
    toRunning();
    const first = store.getState().result!.rankedIds;
    store.getState().finish(first);
    store.getState().start(); // replay
    const second = store.getState().result!.rankedIds;
    expect(second).not.toEqual(first);
  });
});
