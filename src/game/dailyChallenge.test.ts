/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDailyChallenge,
  getDailyDateKey,
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
