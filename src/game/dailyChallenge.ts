/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * One seeded run per calendar day: everyone gets the same city, the same
 * shortened shift and the same target score. Beating the target pays a coin
 * bonus once per day, which is what turns the free-play loop into a habit.
 */

import { getLevelConfig } from './proceduralCity';

export interface DailyChallenge {
  dateKey: string;
  seed: number;
  level: number;
  timeLimitSec: number;
  targetScore: number;
  rewardCoins: number;
}

export interface DailyProgress {
  dateKey: string;
  bestScore: number;
  runs: number;
  claimed: boolean;
}

const STORAGE_KEY = 'courier_field_daily_v1';

export function getDailyDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

/** FNV-1a over the date string: stable across reloads and devices. */
export function hashSeed(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function getDailyChallenge(date: Date = new Date()): DailyChallenge {
  const dateKey = getDailyDateKey(date);
  const seed = hashSeed(dateKey);
  const level = 1 + (seed % 6);
  const baseConfig = getLevelConfig(level);
  return {
    dateKey,
    seed,
    level,
    timeLimitSec: Math.max(60, Math.round(baseConfig.timeLimitSec * 0.85)),
    targetScore: 900 + level * 140,
    rewardCoins: 220 + level * 30,
  };
}

export function loadDailyProgress(): DailyProgress | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DailyProgress>;
    if (!parsed || typeof parsed.dateKey !== 'string') return null;
    return {
      dateKey: parsed.dateKey,
      bestScore: typeof parsed.bestScore === 'number' ? Math.max(0, parsed.bestScore) : 0,
      runs: typeof parsed.runs === 'number' ? Math.max(0, Math.floor(parsed.runs)) : 0,
      claimed: Boolean(parsed.claimed),
    };
  } catch {
    return null;
  }
}

export function saveDailyProgress(progress: DailyProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Storage is a nicety here; a lost daily record must not break the run.
  }
}

export interface DailyRunResult {
  progress: DailyProgress;
  score: number;
  rewardCoins: number;
  cleared: boolean;
  beatTarget: boolean;
}

/**
 * Folds one finished run into today's record. A new calendar day resets the
 * record, so the reward can be earned again tomorrow.
 */
export function recordDailyRun(
  challenge: DailyChallenge,
  previous: DailyProgress | null,
  score: number,
): DailyRunResult {
  const safeScore = Math.max(0, Math.round(score));
  const base: DailyProgress =
    previous && previous.dateKey === challenge.dateKey
      ? previous
      : { dateKey: challenge.dateKey, bestScore: 0, runs: 0, claimed: false };
  const beatTarget = safeScore >= challenge.targetScore;
  const cleared = base.claimed || beatTarget;
  const rewardCoins = beatTarget && !base.claimed ? challenge.rewardCoins : 0;
  return {
    progress: {
      dateKey: challenge.dateKey,
      bestScore: Math.max(base.bestScore, safeScore),
      runs: base.runs + 1,
      claimed: base.claimed || beatTarget,
    },
    score: safeScore,
    rewardCoins,
    cleared,
    beatTarget,
  };
}
