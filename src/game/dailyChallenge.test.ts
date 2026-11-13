/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceChallengeStreak,
  canCheckInToday,
  claimDailyCheckIn,
  createDefaultDailyStreak,
  getDailyChallenge,
  getDailyDateKey,
  getDailyMedalForScore,
  getDisplayCheckInStreak,
  recordDailyRun,
  loadDailyProgress,
} from './dailyChallenge';

test('the daily challenge is stable within a day and rolls over at midnight', () => {
  const morning = getDailyChallenge(new Date(2026, 0, 12, 8, 0, 0));
  const evening = getDailyChallenge(new Date(2026, 0, 12, 22, 30, 0));
  const nextDay = getDailyChallenge(new Date(2026, 0, 13, 8, 0, 0));
  assert.equal(morning.dateKey, '2026-01-12');
  assert.equal(getDailyDateKey(new Date(2026, 0, 12, 22, 30, 0)), '2026-01-12');
  assert.deepEqual(morning, evening);
  assert.notEqual(nextDay.dateKey, morning.dateKey);
  assert.notEqual(nextDay.seed, morning.seed);
});

test('the daily challenge stays inside the playable envelope', () => {
  for (let day = 1; day <= 28; day += 1) {
    const challenge = getDailyChallenge(new Date(2026, 1, day, 12, 0, 0));
    assert.ok(challenge.level >= 1 && challenge.level <= 6);
    assert.ok(challenge.timeLimitSec >= 60);
    assert.ok(challenge.targetScore >= 1000);
    assert.ok(challenge.rewardCoins > 0);
    assert.ok(challenge.silverScore > challenge.bronzeScore);
    assert.ok(challenge.goldScore > challenge.silverScore);
  }
});

test('beating the target pays once per day and keeps the best score', () => {
  const challenge = getDailyChallenge(new Date(2026, 3, 4, 12, 0, 0));
  const miss = recordDailyRun(challenge, null, challenge.targetScore - 100);
  assert.equal(miss.rewardCoins, 0);
  assert.equal(miss.beatTarget, false);
  assert.equal(miss.progress.runs, 1);
  assert.equal(miss.progress.bestScore, challenge.targetScore - 100);

  const clear = recordDailyRun(challenge, miss.progress, challenge.targetScore + 40);
  assert.equal(clear.rewardCoins, challenge.rewardCoins);
  assert.equal(clear.progress.claimed, true);
  assert.equal(clear.progress.runs, 2);

  const repeat = recordDailyRun(challenge, clear.progress, challenge.targetScore + 300);
  assert.equal(repeat.rewardCoins, 0);
  assert.equal(repeat.progress.bestScore, challenge.targetScore + 300);
  assert.equal(repeat.progress.claimed, true);
});

test('a stale record from yesterday does not block today reward', () => {
  const today = getDailyChallenge(new Date(2026, 4, 6, 9, 0, 0));
  const stale = { dateKey: '2026-05-05', bestScore: 9999, runs: 4, claimed: true };
  const result = recordDailyRun(today, stale, today.targetScore);
  assert.equal(result.rewardCoins, today.rewardCoins);
  assert.equal(result.progress.dateKey, today.dateKey);
  assert.equal(result.progress.runs, 1);
  assert.equal(result.progress.bestScore, today.targetScore);
});

test('daily progress storage degrades to null without a browser', () => {
  assert.equal(loadDailyProgress(), null);
});

test('bronze, silver, and gold daily medal tiers pay incrementally once per day', () => {
  const challenge = getDailyChallenge(new Date(2026, 6, 15, 10, 0, 0));
  assert.equal(getDailyMedalForScore(challenge, challenge.bronzeScore - 1), 'none');
  assert.equal(getDailyMedalForScore(challenge, challenge.bronzeScore), 'bronze');
  assert.equal(getDailyMedalForScore(challenge, challenge.silverScore), 'silver');
  assert.equal(getDailyMedalForScore(challenge, challenge.goldScore), 'gold');

  const silverRun = recordDailyRun(challenge, null, challenge.silverScore);
  assert.equal(silverRun.medalEarned, 'silver');
  assert.equal(silverRun.rewardCoins, challenge.rewardCoins + challenge.silverBonusCoins);
  assert.equal(silverRun.spinTokensAwarded, 0);
  assert.deepEqual(silverRun.newlyUnlockedMedals, ['bronze', 'silver']);

  const goldRun = recordDailyRun(challenge, silverRun.progress, challenge.goldScore + 100);
  assert.equal(goldRun.medalEarned, 'gold');
  assert.equal(goldRun.rewardCoins, challenge.goldBonusCoins);
  assert.equal(goldRun.spinTokensAwarded, challenge.goldSpinTokens);
  assert.deepEqual(goldRun.newlyUnlockedMedals, ['gold']);

  const repeatGold = recordDailyRun(challenge, goldRun.progress, challenge.goldScore + 500);
  assert.equal(repeatGold.rewardCoins, 0);
  assert.equal(repeatGold.spinTokensAwarded, 0);
});

test('7-day check-in streak and consecutive daily clear streak grant escalating bonuses', () => {
  let streak = createDefaultDailyStreak();
  const d1 = new Date(2026, 7, 1, 9, 0, 0);
  const d2 = new Date(2026, 7, 2, 9, 0, 0);
  const d4 = new Date(2026, 7, 4, 9, 0, 0);

  assert.equal(canCheckInToday(streak, d1), true);
  const c1 = claimDailyCheckIn(streak, d1);
  assert.equal(c1.claimed, true);
  assert.equal(c1.daySlot, 1);
  assert.equal(canCheckInToday(c1.nextStreak, d1), false);

  const dup = claimDailyCheckIn(c1.nextStreak, d1);
  assert.equal(dup.claimed, false);

  const c2 = claimDailyCheckIn(c1.nextStreak, d2);
  assert.equal(c2.claimed, true);
  assert.equal(c2.nextStreak.streakDays, 2);
  assert.equal(getDisplayCheckInStreak(c2.nextStreak, d2), 2);

  // Missed d3 -> streak resets to 1 on d4
  assert.equal(getDisplayCheckInStreak(c2.nextStreak, d4), 0);
  const c4 = claimDailyCheckIn(c2.nextStreak, d4);
  assert.equal(c4.nextStreak.streakDays, 1);

  // Challenge streak advances on consecutive cleared days
  const s1 = advanceChallengeStreak(streak, '2026-08-01', 'bronze');
  assert.equal(s1.nextStreak.challengeStreakDays, 1);
  assert.equal(s1.streakBonusCoins, 0);

  const s2 = advanceChallengeStreak(s1.nextStreak, '2026-08-02', 'gold');
  assert.equal(s2.nextStreak.challengeStreakDays, 2);
  assert.equal(s2.streakBonusCoins, 40);
});
