/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAREER_MILESTONES,
  RIDER_RANKS,
  claimCareerMilestone,
  exchangeEarningsToCoins,
  getRiderRankInfo,
  hasClaimableMilestone,
  recordCareerShift,
} from './career';
import { createDefaultProgression, purchaseOrSelectLivery } from './progression';
import { LiveryId, OutcomeKind, RunSnapshot, TopperId, VehicleId } from './types';

function makeSnapshot(overrides: Partial<RunSnapshot> = {}): RunSnapshot {
  return {
    outcome: OutcomeKind.Victory,
    level: 1,
    districtName: 'Test Quarter',
    score: 1400,
    bestScore: 1400,
    coinsEarned: 200,
    starsEarned: 3,
    deliveredCount: 5,
    totalStops: 5,
    bullseyeCount: 2,
    maxCombo: 4,
    timeRemainingSec: 25,
    elapsedSec: 65,
    healthRemaining: 3,
    ticketsCount: 0,
    earnedSpinToken: true,
    riderReceipt: {
      totalOrders: 5,
      baseDeliveryFee: 45,
      onTimeBonus: 25,
      hotMealTip: 15,
      bullseyeTip: 12,
      rushHourBonus: 30,
      spillDeduction: 0,
      trafficFines: 0,
      lateDeduction: 0,
      netEarningsYuan: 127,
      praiseRate: 100,
    },
    ...overrides,
  };
}

test('rider ranks scale exchange rates cleanly across all 6 tiers', () => {
  assert.equal(RIDER_RANKS.length, 6);
  const rookie = getRiderRankInfo(0);
  assert.equal(rookie.current.tier, 1);
  assert.equal(rookie.current.exchangeRate, 5);

  const gold = getRiderRankInfo(800);
  assert.equal(gold.current.tier, 4);
  assert.equal(gold.current.exchangeRate, 8);

  const legend = getRiderRankInfo(2500);
  assert.equal(legend.current.tier, 6);
  assert.equal(legend.current.exchangeRate, 10);
  assert.equal(legend.next, null);
  assert.equal(legend.progressPct, 100);
});

test('recordCareerShift banks ¥ earnings and exchanges them at rank rate', () => {
  const prog = createDefaultProgression();
  const snap = makeSnapshot({ deliveredCount: 6, bullseyeCount: 3, starsEarned: 3, ticketsCount: 0 });
  const shiftRes = recordCareerShift(prog, snap);

  assert.ok(shiftRes.xpGained > 0);
  assert.equal(shiftRes.next.career.unconvertedYuan, 127);
  assert.equal(shiftRes.next.career.totalDeliveries, 6);
  assert.equal(shiftRes.next.career.cleanShifts, 1);

  const ex = exchangeEarningsToCoins(shiftRes.next);
  const expectedRate = getRiderRankInfo(shiftRes.next.career.careerXp).current.exchangeRate;
  assert.equal(ex.rateUsed, expectedRate);
  assert.equal(ex.coinsAwarded, Math.round(127 * expectedRate));
  assert.equal(ex.next.coins, prog.coins + ex.coinsAwarded);
  assert.equal(ex.next.career.unconvertedYuan, 0);
  assert.equal(ex.next.career.totalExchangedCoins, ex.coinsAwarded);
});

test('milestones unlock exclusive liveries and Neon Lightbox topper', () => {
  let prog = createDefaultProgression();
  assert.equal(hasClaimableMilestone(prog), false);

  // Simulate completing enough shifts & earnings to unlock Jade livery + Neon Lightbox + Sakura
  prog = {
    ...prog,
    career: {
      ...prog.career,
      totalEarningsYuan: 900,
      totalDeliveries: 20,
      cleanShifts: 3,
      careerXp: 950,
    },
  };
  assert.equal(hasClaimableMilestone(prog), true);

  for (const ms of CAREER_MILESTONES) {
    const res = claimCareerMilestone(prog, ms.id);
    assert.equal(res.claimed, true);
    prog = res.next;
  }

  assert.ok(prog.unlockedLiveries.includes(LiveryId.JadeExpress));
  assert.ok(prog.unlockedLiveries.includes(LiveryId.SakuraRush));
  assert.ok(prog.unlockedLiveries.includes(LiveryId.CyberNeon));
  assert.ok(prog.unlockedLiveries.includes(LiveryId.GoldChampion));
  assert.ok(prog.unlockedToppers.includes(TopperId.NeonLightbox));

  // Duplicate claim is a no-op
  const dup = claimCareerMilestone(prog, 'ms_jade_livery');
  assert.equal(dup.claimed, false);
  assert.equal(dup.next.coins, prog.coins);
});

test('purchaseOrSelectLivery equips unlocked wraps and blocks locked ones', () => {
  const prog = createDefaultProgression();
  const blocked = purchaseOrSelectLivery(prog, LiveryId.CyberNeon);
  assert.equal(blocked.success, false);
  assert.equal(blocked.next.selectedLivery, LiveryId.Standard);

  const unlockedProg = {
    ...prog,
    selectedVehicle: VehicleId.KeiTruck,
    unlockedLiveries: [LiveryId.Standard, LiveryId.CyberNeon],
  };
  const equipped = purchaseOrSelectLivery(unlockedProg, LiveryId.CyberNeon);
  assert.equal(equipped.success, true);
  assert.equal(equipped.next.selectedLivery, LiveryId.CyberNeon);
});
