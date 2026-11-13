/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Which run the canvas is about to build. Free play seeds the city from the
 * level number; the daily challenge pins the seed and the level so every
 * player sees the same city on the same day, and so a ghost recording can be
 * keyed to a stable identity.
 */

export type RunModeKind = 'free' | 'daily';

export interface RunModeState {
  kind: RunModeKind;
  level: number;
  seed?: number;
  dateKey?: string;
  /** Shortened shift, used by the daily challenge. */
  timeLimitSec?: number;
}

let activeRunMode: RunModeState = { kind: 'free', level: 1 };

export function setRunMode(next: RunModeState): void {
  activeRunMode = { ...next };
}

export function getRunMode(): RunModeState {
  return activeRunMode;
}

/** Stable key for the local ghost recording of the next run. */
export function getGhostKey(level: number, mode: RunModeState = activeRunMode): string {
  if (mode.kind === 'daily' && mode.dateKey) return 'daily:' + mode.dateKey;
  return 'level:' + level;
}
