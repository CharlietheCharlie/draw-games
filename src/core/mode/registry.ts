/**
 * The game-mode registry. Modes self-register (side-effect import) and the shell
 * looks them up by id. This is the single seam that makes new draw mechanisms
 * pluggable without touching the shell.
 */
import type { GameMode, AnyGameMode } from './GameMode';

const registry = new Map<string, AnyGameMode>();

export function registerMode<TState>(mode: GameMode<TState>): void {
  if (registry.has(mode.id)) {
    throw new Error(`GameMode "${mode.id}" is already registered`);
  }
  // TState is invariant on GameMode; the shell only ever handles it opaquely.
  registry.set(mode.id, mode as AnyGameMode);
}

export function getMode(id: string): AnyGameMode {
  const mode = registry.get(id);
  if (!mode) throw new Error(`Unknown GameMode "${id}"`);
  return mode;
}

export function hasMode(id: string): boolean {
  return registry.has(id);
}

export function listModes(): AnyGameMode[] {
  return [...registry.values()];
}
