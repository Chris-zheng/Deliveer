/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * One seeded run per calendar day: everyone gets the same city, the same
 * shortened shift, Bronze / Silver / Gold medal tiers, and a consecutive
 * daily check-in & challenge streak system.
 */

import { getLevelConfig } from './proceduralCity';

export type DailyMedal = 'none' | 'bronze' | 'silver' | 'gold';

export interface DailyChallenge {
  dateKey: string;
  seed: number;
  level: number;
  timeLimitSec: number;
  targetScore: number; // Bronze threshold
  rewardCoins: number; // Bronze reward
  bronzeScore: number;
  silverScore: number;
  goldScore: number;
  silverBonusCoins: number;
  goldBonusCoins: number;
  goldSpinTokens: number;
}

export interface DailyMedalFlags {
  bronze: boolean;
  silver: boolean;
  gold: boolean;
}

export interface DailyProgress {
  dateKey: string;
  bestScore: number;
  runs: number;
  claimed: boolean;
  bestMedal?: DailyMedal;
  claimedMedals?: DailyMedalFlags;
}

export interface DailyStreakState {
  streakDays: number;
  lastCheckInDateKey: string | null;
  totalCheckIns: number;
  challengeStreakDays: number;
  lastMedalDateKey: string | null;
}

export interface StreakDayReward {
  day: number; // 1..7
  coins: number;
  spinTokens: number;
  freeShield: boolean;
  labelZh: string;
  labelEn: string;
}

export const STREAK_DAY_REWARDS: StreakDayReward[] = [
  { day: 1, coins: 60, spinTokens: 0, freeShield: false, labelZh: '+60 🪙', labelEn: '+60 Coins' },
  { day: 2, coins: 90, spinTokens: 0, freeShield: false, labelZh: '+90 🪙', labelEn: '+90 Coins' },
  { day: 3, coins: 140, spinTokens: 1, freeShield: false, labelZh: '+140 🪙 +1券', labelEn: '+140 + Spin' },
  { day: 4, coins: 180, spinTokens: 0, freeShield: false, labelZh: '+180 🪙', labelEn: '+180 Coins' },
  { day: 5, coins: 240, spinTokens: 0, freeShield: true, labelZh: '+240 🪙 +护盾', labelEn: '+240 + Shield' },
  { day: 6, coins: 300, spinTokens: 0, freeShield: false, labelZh: '+300 🪙', labelEn: '+300 Coins' },
  { day: 7, coins: 500, spinTokens: 2, freeShield: true, labelZh: '+500 🪙 +2券', labelEn: '+500 + 2 Spins' },
];

const STORAGE_KEY = 'courier_field_daily_v1';
const STREAK_STORAGE_KEY = 'courier_field_daily_streak_v1';

export function getDailyDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

export function getPreviousDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return '';
  const dt = new Date(y, m - 1, d - 1);
  return getDailyDateKey(dt);
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
  const targetScore = 900 + level * 140;
  const rewardCoins = 220 + level * 30;
  return {
    dateKey,
    seed,
    level,
    timeLimitSec: Math.max(60, Math.round(baseConfig.timeLimitSec * 0.85)),
    targetScore,
    rewardCoins,
    bronzeScore: targetScore,
    silverScore: Math.round(targetScore * 1.35),
    goldScore: Math.round(targetScore * 1.75),
    silverBonusCoins: Math.round(rewardCoins * 0.75),
    goldBonusCoins: Math.round(rewardCoins * 1.25),
    goldSpinTokens: 1,
  };
}

export function getDailyMedalForScore(challenge: DailyChallenge, score: number): DailyMedal {
  if (score >= challenge.goldScore) return 'gold';
  if (score >= challenge.silverScore) return 'silver';
  if (score >= challenge.bronzeScore) return 'bronze';
  return 'none';
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
      bestMedal:
        parsed.bestMedal === 'gold' ||
        parsed.bestMedal === 'silver' ||
        parsed.bestMedal === 'bronze'
          ? parsed.bestMedal
          : parsed.claimed
            ? 'bronze'
            : 'none',
      claimedMedals: {
        bronze: Boolean(parsed.claimedMedals?.bronze ?? parsed.claimed),
        silver: Boolean(parsed.claimedMedals?.silver),
        gold: Boolean(parsed.claimedMedals?.gold),
      },
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

export function createDefaultDailyStreak(): DailyStreakState {
  return {
    streakDays: 0,
    lastCheckInDateKey: null,
    totalCheckIns: 0,
    challengeStreakDays: 0,
    lastMedalDateKey: null,
  };
}

export function loadDailyStreak(): DailyStreakState {
  if (typeof window === 'undefined') return createDefaultDailyStreak();
  try {
    const raw = window.localStorage.getItem(STREAK_STORAGE_KEY);
    if (!raw) return createDefaultDailyStreak();
    const parsed = JSON.parse(raw) as Partial<DailyStreakState>;
    return {
      streakDays:
        typeof parsed.streakDays === 'number' ? Math.max(0, Math.floor(parsed.streakDays)) : 0,
      lastCheckInDateKey:
        typeof parsed.lastCheckInDateKey === 'string' ? parsed.lastCheckInDateKey : null,
      totalCheckIns:
        typeof parsed.totalCheckIns === 'number'
          ? Math.max(0, Math.floor(parsed.totalCheckIns))
          : 0,
      challengeStreakDays:
        typeof parsed.challengeStreakDays === 'number'
          ? Math.max(0, Math.floor(parsed.challengeStreakDays))
          : 0,
      lastMedalDateKey:
        typeof parsed.lastMedalDateKey === 'string' ? parsed.lastMedalDateKey : null,
    };
  } catch {
    return createDefaultDailyStreak();
  }
}

export function saveDailyStreak(streak: DailyStreakState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(streak));
  } catch {
    // Ignore storage errors
  }
}

export function canCheckInToday(
  streak: DailyStreakState,
  todayDate: Date = new Date(),
): boolean {
  const todayKey = getDailyDateKey(todayDate);
  return streak.lastCheckInDateKey !== todayKey;
}

export function getDisplayCheckInStreak(
  streak: DailyStreakState,
  todayDate: Date = new Date(),
): number {
  const todayKey = getDailyDateKey(todayDate);
  const yesterdayKey = getPreviousDateKey(todayKey);
  if (
    streak.lastCheckInDateKey === todayKey ||
    streak.lastCheckInDateKey === yesterdayKey
  ) {
    return streak.streakDays;
  }
  return 0;
}

export function claimDailyCheckIn(
  streak: DailyStreakState,
  todayDate: Date = new Date(),
): {
  nextStreak: DailyStreakState;
  rewardCoins: number;
  spinTokens: number;
  freeShield: boolean;
  daySlot: number; // 1..7
  claimed: boolean;
} {
  const todayKey = getDailyDateKey(todayDate);
  if (streak.lastCheckInDateKey === todayKey) {
    return {
      nextStreak: streak,
      rewardCoins: 0,
      spinTokens: 0,
      freeShield: false,
      daySlot: ((Math.max(1, streak.streakDays) - 1) % 7) + 1,
      claimed: false,
    };
  }

  const yesterdayKey = getPreviousDateKey(todayKey);
  const nextDays =
    streak.lastCheckInDateKey === yesterdayKey ? streak.streakDays + 1 : 1;
  const daySlot = ((nextDays - 1) % 7) + 1;
  const reward = STREAK_DAY_REWARDS[daySlot - 1];

  return {
    nextStreak: {
      ...streak,
      streakDays: nextDays,
      lastCheckInDateKey: todayKey,
      totalCheckIns: streak.totalCheckIns + 1,
    },
    rewardCoins: reward.coins,
    spinTokens: reward.spinTokens,
    freeShield: reward.freeShield,
    daySlot,
    claimed: true,
  };
}

export interface DailyRunResult {
  progress: DailyProgress;
  score: number;
  rewardCoins: number;
  spinTokensAwarded: number;
  medalEarned: DailyMedal;
  bestMedal: DailyMedal;
  newlyUnlockedMedals: DailyMedal[];
  cleared: boolean;
  beatTarget: boolean;
}

const MEDAL_RANK: Record<DailyMedal, number> = {
  none: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
};

/**
 * Folds one finished run into today's record, awarding incremental Bronze, Silver,
 * and Gold medal rewards once each per day.
 */
export function recordDailyRun(
  challenge: DailyChallenge,
  previous: DailyProgress | null,
  score: number,
): DailyRunResult {
  const safeScore = Math.max(0, Math.round(score));
  const isSameDay = previous && previous.dateKey === challenge.dateKey;
  const prevMedals: DailyMedalFlags = isSameDay
    ? {
        bronze: Boolean(previous.claimedMedals?.bronze ?? previous.claimed),
        silver: Boolean(previous.claimedMedals?.silver),
        gold: Boolean(previous.claimedMedals?.gold),
      }
    : { bronze: false, silver: false, gold: false };

  const base: DailyProgress = isSameDay
    ? {
        ...previous,
        claimedMedals: prevMedals,
        bestMedal: previous.bestMedal ?? (previous.claimed ? 'bronze' : 'none'),
      }
    : {
        dateKey: challenge.dateKey,
        bestScore: 0,
        runs: 0,
        claimed: false,
        bestMedal: 'none',
        claimedMedals: prevMedals,
      };

  const runMedal = getDailyMedalForScore(challenge, safeScore);
  const nextBestScore = Math.max(base.bestScore, safeScore);
  const bestMedal =
    MEDAL_RANK[runMedal] >= MEDAL_RANK[base.bestMedal ?? 'none']
      ? runMedal
      : (base.bestMedal ?? 'none');

  let rewardCoins = 0;
  let spinTokensAwarded = 0;
  const newlyUnlockedMedals: DailyMedal[] = [];
  const nextClaimedMedals: DailyMedalFlags = { ...prevMedals };

  if (safeScore >= challenge.bronzeScore && !nextClaimedMedals.bronze) {
    nextClaimedMedals.bronze = true;
    rewardCoins += challenge.rewardCoins;
    newlyUnlockedMedals.push('bronze');
  }
  if (safeScore >= challenge.silverScore && !nextClaimedMedals.silver) {
    nextClaimedMedals.silver = true;
    rewardCoins += challenge.silverBonusCoins;
    newlyUnlockedMedals.push('silver');
  }
  if (safeScore >= challenge.goldScore && !nextClaimedMedals.gold) {
    nextClaimedMedals.gold = true;
    rewardCoins += challenge.goldBonusCoins;
    spinTokensAwarded += challenge.goldSpinTokens;
    newlyUnlockedMedals.push('gold');
  }

  const beatTarget = safeScore >= challenge.targetScore;
  const cleared = Boolean(nextClaimedMedals.bronze);

  return {
    progress: {
      dateKey: challenge.dateKey,
      bestScore: nextBestScore,
      runs: base.runs + 1,
      claimed: cleared,
      bestMedal,
      claimedMedals: nextClaimedMedals,
    },
    score: safeScore,
    rewardCoins,
    spinTokensAwarded,
    medalEarned: runMedal,
    bestMedal,
    newlyUnlockedMedals,
    cleared,
    beatTarget,
  };
}

export function advanceChallengeStreak(
  streak: DailyStreakState,
  challengeDateKey: string,
  medalEarned: DailyMedal,
): { nextStreak: DailyStreakState; streakBonusCoins: number } {
  if (medalEarned === 'none' || streak.lastMedalDateKey === challengeDateKey) {
    return { nextStreak: streak, streakBonusCoins: 0 };
  }
  const yesterdayKey = getPreviousDateKey(challengeDateKey);
  const nextDays =
    streak.lastMedalDateKey === yesterdayKey ? streak.challengeStreakDays + 1 : 1;
  // Consecutive challenge clears from Day 2+ grant escalating streak coin bonus
  const streakBonusCoins = nextDays >= 2 ? Math.min(200, (nextDays - 1) * 40) : 0;
  return {
    nextStreak: {
      ...streak,
      challengeStreakDays: nextDays,
      lastMedalDateKey: challengeDateKey,
    },
    streakBonusCoins,
  };
}
