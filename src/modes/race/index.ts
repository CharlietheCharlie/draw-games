/**
 * The race game mode: a `GameMode<RaceState>` assembled from the pure sim, the
 * scene, and the camera director. Definition only — registration happens in
 * `modes/registerAll.ts` so it stays idempotent under hot-reload.
 */
import type { GameMode } from '@/core/mode/GameMode';
import { MAX_PARTICIPANTS } from '@/lib/types';
import { createRaceState, stepRace, raceRanking, raceIsFinished, type RaceState } from './raceState';
import { RaceScene } from './RaceScene';
import { raceCamera } from './raceCamera';

export const raceMode: GameMode<RaceState> = {
  id: 'race',
  label: '🏃 操場賽跑 · Track Race',
  maxParticipants: MAX_PARTICIPANTS,
  createState: createRaceState,
  step: stepRace,
  isFinished: raceIsFinished,
  getRanking: raceRanking,
  Scene: RaceScene,
  camera: raceCamera,
};

export type { RaceState };
