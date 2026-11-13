/**
 * src/game/sim/scoring.ts
 *
 * Extracted verbatim from src/game/rules.ts — no logic changes.
 * Public API is re-exported by src/game/rules.ts.
 */

import {
  DeliveryStop,
  OutcomeKind,
  ParcelKind,
  VIPRole,
} from '../types';
import type { CustomerArchetype } from '../types';

import {
  FEVER_COMBO_THRESHOLD,
  RUSH_PROMISE_COIN_BONUS,
  RUSH_PROMISE_POINT_MULT,
} from '../../config/balance';

import { ARCHETYPE_RULES } from '../archetypes';

import {
  DeliveryReward,
} from './delivery';

export function calculateDeliveryScore(
  currentCombo: number,
  comboTimer: number,
  viaExpressToss: boolean,
  level: number,
  parcelKind: ParcelKind = ParcelKind.Small,
  fragileIntact: boolean = true,
  options?: {
    bullseye?: boolean;
    thermalTimer?: number;
    vipRole?: VIPRole;
    ticketsCount?: number;
    archetype?: CustomerArchetype;
    rushPromise?: boolean;
  },
): DeliveryReward {
  const bullseye = Boolean(options?.bullseye);
  const thermalTimer = options?.thermalTimer ?? 0;
  const vipRole = options?.vipRole ?? 'none';
  const ticketsCount = options?.ticketsCount ?? 0;
  const archetype = options?.archetype ?? 'chill';
  const rushPromise = Boolean(options?.rushPromise);
  const archetypeRule = ARCHETYPE_RULES[archetype];

  const comboStep = bullseye ? 2 : 1;
  const nextCombo = comboTimer > 0 ? currentCombo + comboStep : comboStep;
  const isFever = nextCombo >= FEVER_COMBO_THRESHOLD;

  const kindBase =
    parcelKind === ParcelKind.Large
      ? 260
      : parcelKind === ParcelKind.HotExpress
        ? 210
        : parcelKind === ParcelKind.Fragile
          ? 185
          : 150;
  const basePoints = kindBase + (level - 1) * 25;
  const tossBonus = viaExpressToss ? 75 : 0;
  const pristineBonus =
    parcelKind === ParcelKind.Fragile && fragileIntact ? 90 : 0;
  const thermalBonus =
    parcelKind === ParcelKind.HotExpress && thermalTimer > 0 ? 110 : 0;
  const bullseyeBonus = bullseye ? 85 : 0;
  const vipBonus =
    vipRole === 'chef'
      ? 90
      : vipRole === 'captain'
        ? 100
        : vipRole === 'mayor' && ticketsCount === 0
          ? 120
          : 0;

  const comboMultiplier = (1 + (nextCombo - 1) * 0.25) * (isFever ? 1.25 : 1.0);
  const pointsAwarded = Math.round(
    (basePoints +
      tossBonus +
      pristineBonus +
      thermalBonus +
      bullseyeBonus +
      vipBonus) *
      comboMultiplier *
      (rushPromise ? RUSH_PROMISE_POINT_MULT : 1),
  );

  const mayorTimeExtra = vipRole === 'mayor' && ticketsCount === 0 ? 5 : 0;
  const timeBonusSec = Math.max(
    2,
    (parcelKind === ParcelKind.Large ? 5 : viaExpressToss ? 4 : 3) +
      mayorTimeExtra +
      archetypeRule.timeBonusDeltaSec,
  );

  const coinsAwarded =
    (25 + (bullseye ? 15 : 0) + (vipBonus > 0 ? 20 : 0)) * (isFever ? 2 : 1) +
    (rushPromise ? RUSH_PROMISE_COIN_BONUS : 0);

  // Food Delivery Rider Monetary Economy (RMB ¥)
  const baseDeliveryFeeYuan = Number(
    (6.5 + Math.min(4.0, (level - 1) * 0.6) + (parcelKind === ParcelKind.Large ? 3.0 : 0)).toFixed(1),
  );
  const onTimeBonusYuan = 2.5;
  const archetypeTipVoided = archetypeRule.requiresBullseyeTip && !bullseye;
  const tipBonusYuan = Number(
    (
      (archetypeTipVoided
        ? 0
        : (thermalBonus > 0 ? 3.5 : 0) +
          (bullseye ? 2.0 : 0) +
          (pristineBonus > 0 ? 2.0 : 0) +
          (vipBonus > 0 ? 3.5 : 0) +
          (isFever ? 2.0 : 0) + archetypeRule.extraTipYuan)
    ).toFixed(1),
  );
  const spillPenaltyYuan =
    !fragileIntact && parcelKind === ParcelKind.Fragile ? 3.0 : 0;
  const netDeliveryEarningsYuan = Math.max(
    1.0,
    Number(
      (baseDeliveryFeeYuan + onTimeBonusYuan + tipBonusYuan - spillPenaltyYuan).toFixed(1),
    ),
  );

  return {
    pointsAwarded,
    coinsAwarded,
    timeBonusSec,
    nextCombo,
    pristineBonus,
    thermalBonus,
    bullseyeBonus,
    vipBonus,
    isFever,
    baseDeliveryFeeYuan,
    onTimeBonusYuan,
    tipBonusYuan,
    spillPenaltyYuan,
    netDeliveryEarningsYuan,
  };
}

export function evaluateRunStatus(
  stops: DeliveryStop[],
  timeRemainingSec: number,
  health: number,
): OutcomeKind {
  if (stops.length > 0 && stops.every((s) => s.delivered)) {
    return OutcomeKind.Victory;
  }
  if (health <= 0) {
    return OutcomeKind.Breakdown;
  }
  if (timeRemainingSec <= 0) {
    return OutcomeKind.OutOfTime;
  }
  return OutcomeKind.None;
}
