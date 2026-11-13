/**
 * src/game/sim/delivery.ts
 *
 * Extracted verbatim from src/game/rules.ts — no logic changes.
 * Public API is re-exported by src/game/rules.ts.
 */

import {
  DeliveryStop,
  ParcelKind,
  TruckState,
  VehicleId,
} from '../types';

import {
  AUTO_DROP_RADIUS,
  BULLSEYE_PAD_RADIUS,
  EXPRESS_TOSS_RADIUS,
  LARGE_MAX_UNLOAD_SPEED,
  LARGE_UNLOAD_RADIUS,
  SMALL_TOSS_RADIUS,
} from '../../config/balance';

import {
  gridToWorld,
} from '../proceduralCity';

import {
  VEHICLE_SPECS,
} from '../progression';

export function getActiveStop(stops: DeliveryStop[]): DeliveryStop | null {
  for (const s of stops) {
    if (!s.delivered) return s;
  }
  return null;
}

export interface DeliveryCheck {
  canAutoDrop: boolean;
  canExpressToss: boolean;
  canBullseyeToss: boolean;
  needsBrakeForLarge: boolean;
  distance: number;
}

export function checkDeliveryEligibility(
  truck: TruckState,
  stop: DeliveryStop | null,
  totalGridSize: number,
): DeliveryCheck {
  if (!stop || stop.delivered) {
    return {
      canAutoDrop: false,
      canExpressToss: false,
      canBullseyeToss: false,
      needsBrakeForLarge: false,
      distance: Infinity,
    };
  }
  const spec = VEHICLE_SPECS[truck.vehicleId] ?? VEHICLE_SPECS[VehicleId.ClassicVan];
  const padPos = gridToWorld(stop.roadCoord, totalGridSize);
  const baseCitizen = gridToWorld(stop.citizenCoord, totalGridSize);
  const cx = stop.liveCitizenX ?? baseCitizen.x;
  const cz = stop.liveCitizenZ ?? baseCitizen.z;

  const distPad = Math.hypot(truck.x - padPos.x, truck.z - padPos.z);
  const distCitizen = Math.hypot(truck.x - cx, truck.z - cz);
  const effectiveTossDist = Math.min(distPad, distCitizen);
  const isBullseye =
    distPad <= BULLSEYE_PAD_RADIUS ||
    (effectiveTossDist >= 1.55 && effectiveTossDist <= 2.6);

  if (stop.parcelKind === ParcelKind.Large) {
    const inLargeZone =
      distPad <= LARGE_UNLOAD_RADIUS ||
      effectiveTossDist <= LARGE_UNLOAD_RADIUS + 0.25;
    const slowEnough = truck.speed <= LARGE_MAX_UNLOAD_SPEED;
    return {
      canAutoDrop: distPad <= AUTO_DROP_RADIUS && slowEnough,
      canExpressToss: inLargeZone && slowEnough,
      canBullseyeToss: distPad <= BULLSEYE_PAD_RADIUS && slowEnough,
      needsBrakeForLarge: inLargeZone && !slowEnough,
      distance: effectiveTossDist,
    };
  }

  if (
    stop.parcelKind === ParcelKind.Small ||
    stop.parcelKind === ParcelKind.HotExpress
  ) {
    const maxRange = SMALL_TOSS_RADIUS + spec.smallTossRangeBonus;
    const canToss = effectiveTossDist <= maxRange;
    return {
      canAutoDrop: distPad <= AUTO_DROP_RADIUS,
      canExpressToss: canToss,
      canBullseyeToss: canToss && isBullseye,
      needsBrakeForLarge: false,
      distance: effectiveTossDist,
    };
  }

  // ParcelKind.Fragile
  const fragRange = EXPRESS_TOSS_RADIUS + spec.smallTossRangeBonus * 0.5;
  const canToss = effectiveTossDist <= fragRange;
  return {
    canAutoDrop: distPad <= AUTO_DROP_RADIUS,
    canExpressToss: canToss,
    canBullseyeToss: canToss && isBullseye,
    needsBrakeForLarge: false,
    distance: effectiveTossDist,
  };
}

export interface DeliveryReward {
  pointsAwarded: number;
  coinsAwarded: number;
  timeBonusSec: number;
  nextCombo: number;
  pristineBonus: number;
  thermalBonus: number;
  bullseyeBonus: number;
  vipBonus: number;
  isFever: boolean;
  baseDeliveryFeeYuan: number;
  onTimeBonusYuan: number;
  tipBonusYuan: number;
  spillPenaltyYuan: number;
  netDeliveryEarningsYuan: number;
}
