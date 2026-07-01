/**
 * Single place that registers every built-in game mode. Adding a new draw
 * mechanism is a one-line change here (plus its own folder). Idempotent, so it
 * survives Next.js fast-refresh re-evaluation.
 */
import { registerMode, hasMode } from '@/core/mode/registry';
import type { AnyGameMode } from '@/core/mode/GameMode';
import { raceMode } from './race';
// Future modes implement the same GameMode contract and slot in here:
// import { rouletteMode } from './roulette';
// import { ladderMode } from './ladder';

const ALL_MODES: AnyGameMode[] = [raceMode as AnyGameMode /* , rouletteMode, ladderMode */];

export function registerAllModes(): void {
  for (const mode of ALL_MODES) {
    if (!hasMode(mode.id)) registerMode(mode);
  }
}

// Register on import so any client entry that imports this file is ready to go.
registerAllModes();
