/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VEHICLE_SPECS, VehicleSpec } from './progression';
import { PlayerProgression, UpgradeLevels, UpgradeTrack, VehicleId } from './types';

export interface UpgradeTier {
  level: number;
  costCoins: number;
  nameZh: string;
  nameEn: string;
  detailZh: string;
  detailEn: string;
}

export interface UpgradeTrackSpec {
  id: UpgradeTrack;
  nameZh: string;
  nameEn: string;
  summaryZh: string;
  summaryEn: string;
  tiers: UpgradeTier[];
}

export const MAX_UPGRADE_LEVEL = 3;

export const UPGRADE_TRACK_ORDER: UpgradeTrack[] = ['engine', 'tires', 'cargo'];

export const UPGRADE_TRACKS: Record<UpgradeTrack, UpgradeTrackSpec> = {
  engine: {
    id: 'engine',
    nameZh: '引擎调校',
    nameEn: 'Engine',
    summaryZh: '提升极速与起步加速，跑远郊单更稳',
    summaryEn: 'Top speed and launch acceleration for long hauls',
    tiers: [
      { level: 1, costCoins: 700, nameZh: '涡轮导管', nameEn: 'Turbo intake', detailZh: '极速 +6% · 加速 +8%', detailEn: '+6% top speed · +8% accel' },
      { level: 2, costCoins: 1600, nameZh: '双涡管增压', nameEn: 'Twin-scroll boost', detailZh: '极速 +12% · 加速 +16%', detailEn: '+12% top speed · +16% accel' },
      { level: 3, costCoins: 3000, nameZh: '赛道级 ECU', nameEn: 'Race ECU', detailZh: '极速 +20% · 加速 +26%', detailEn: '+20% top speed · +26% accel' },
    ],
  },
  tires: {
    id: 'tires',
    nameZh: '轮胎抓地',
    nameEn: 'Tires',
    summaryZh: '转向响应更快，直角弯不必提前松油',
    summaryEn: 'Sharper steering so right-angle turns stay flat out',
    tiers: [
      { level: 1, costCoins: 600, nameZh: '全天候胎纹', nameEn: 'All-weather tread', detailZh: '转向 +8%', detailEn: '+8% steering' },
      { level: 2, costCoins: 1400, nameZh: '低扁平运动胎', nameEn: 'Low-profile sport', detailZh: '转向 +16%', detailEn: '+16% steering' },
      { level: 3, costCoins: 2600, nameZh: '赛道半热熔', nameEn: 'Semi-slick compound', detailZh: '转向 +25%', detailEn: '+25% steering' },
    ],
  },
  cargo: {
    id: 'cargo',
    nameZh: '货架改装',
    nameEn: 'Cargo rack',
    summaryZh: '抛投射程更远，热餐保温更久',
    summaryEn: 'Longer toss range and a warmer, more forgiving hot box',
    tiers: [
      { level: 1, costCoins: 500, nameZh: '保温箱衬', nameEn: 'Insulated liner', detailZh: '抛投 +0.4 米 · 保温 +6 秒', detailEn: '+0.4m toss · +6s warmth' },
      { level: 2, costCoins: 1200, nameZh: '减震货架', nameEn: 'Damped rack', detailZh: '抛投 +0.8 米 · 保温 +12 秒', detailEn: '+0.8m toss · +12s warmth' },
      { level: 3, costCoins: 2200, nameZh: '恒温恒湿舱', nameEn: 'Climate cargo bay', detailZh: '抛投 +1.3 米 · 保温 +20 秒', detailEn: '+1.3m toss · +20s warmth' },
    ],
  },
};

interface EngineBonus { maxSpeed: number; accel: number }
interface CargoBonus { toss: number; thermal: number }

const ENGINE_BONUS: EngineBonus[] = [
  { maxSpeed: 0.06, accel: 0.08 },
  { maxSpeed: 0.12, accel: 0.16 },
  { maxSpeed: 0.2, accel: 0.26 },
];
const TIRE_BONUS: number[] = [0.08, 0.16, 0.25];
const CARGO_BONUS: CargoBonus[] = [
  { toss: 0.4, thermal: 6 },
  { toss: 0.8, thermal: 12 },
  { toss: 1.3, thermal: 20 },
];

export function createDefaultUpgradeLevels(): UpgradeLevels {
  return { engine: 0, tires: 0, cargo: 0 };
}

export function clampUpgradeLevel(value: unknown): number {
  const parsed = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 0;
  return Math.max(0, Math.min(MAX_UPGRADE_LEVEL, parsed));
}

export function normalizeUpgradeLevels(
  raw: Partial<Record<UpgradeTrack, unknown>> | null | undefined,
): UpgradeLevels {
  return {
    engine: clampUpgradeLevel(raw ? raw.engine : 0),
    tires: clampUpgradeLevel(raw ? raw.tires : 0),
    cargo: clampUpgradeLevel(raw ? raw.cargo : 0),
  };
}

export interface UpgradeBonuses {
  maxSpeedMult: number;
  accelMult: number;
  turnSpeedMult: number;
  smallTossRangeBonus: number;
  thermalBonusSec: number;
}

let activeUpgradeLevels: UpgradeLevels = createDefaultUpgradeLevels();

/**
 * The garage upgrades are permanent account state, but the truck simulation is a
 * pure function of the city. This module-level slot keeps that boundary honest:
 * App pushes the saved levels once per change and the sim reads them here.
 */
export function applyUpgradeLevels(levels: UpgradeLevels | null | undefined): void {
  activeUpgradeLevels = normalizeUpgradeLevels(levels);
}

export function getActiveUpgradeLevels(): UpgradeLevels {
  return { ...activeUpgradeLevels };
}

export function computeUpgradeBonuses(levels: UpgradeLevels | null | undefined): UpgradeBonuses {
  const safe = normalizeUpgradeLevels(levels);
  const engine: EngineBonus = ENGINE_BONUS[safe.engine - 1] || { maxSpeed: 0, accel: 0 };
  const tire = TIRE_BONUS[safe.tires - 1] || 0;
  const cargo: CargoBonus = CARGO_BONUS[safe.cargo - 1] || { toss: 0, thermal: 0 };
  return {
    maxSpeedMult: 1 + engine.maxSpeed,
    accelMult: 1 + engine.accel,
    turnSpeedMult: 1 + tire,
    smallTossRangeBonus: cargo.toss,
    thermalBonusSec: cargo.thermal,
  };
}

export function getUpgradeBonuses(): UpgradeBonuses {
  return computeUpgradeBonuses(activeUpgradeLevels);
}

export function nextUpgradeTier(track: UpgradeTrack, currentLevel: number): UpgradeTier | null {
  const spec = UPGRADE_TRACKS[track];
  if (!spec) return null;
  const level = clampUpgradeLevel(currentLevel);
  return spec.tiers[level] || null;
}

export function totalUpgradeSpend(levels: UpgradeLevels | null | undefined): number {
  const safe = normalizeUpgradeLevels(levels);
  let total = 0;
  UPGRADE_TRACK_ORDER.forEach((track) => {
    const spec = UPGRADE_TRACKS[track];
    for (let i = 0; i < safe[track]; i += 1) total += spec.tiers[i].costCoins;
  });
  return total;
}

export type UpgradePurchaseReason = 'purchased' | 'maxed' | 'insufficient';

export interface UpgradePurchaseResult {
  progression: PlayerProgression;
  tier: UpgradeTier | null;
  reason: UpgradePurchaseReason;
}

export function purchaseUpgrade(
  progression: PlayerProgression,
  track: UpgradeTrack,
): UpgradePurchaseResult {
  const levels = normalizeUpgradeLevels(progression.upgrades);
  const current = levels[track];
  const tier = nextUpgradeTier(track, current);
  if (!tier) return { progression, tier: null, reason: 'maxed' };
  if (progression.coins < tier.costCoins) return { progression, tier, reason: 'insufficient' };
  return {
    progression: {
      ...progression,
      coins: progression.coins - tier.costCoins,
      upgrades: { ...levels, [track]: current + 1 },
    },
    tier,
    reason: 'purchased',
  };
}

/** Vehicle spec merged with the permanent garage upgrades currently applied. */
export function resolveVehicleSpec(vehicleId: VehicleId): VehicleSpec {
  const base = VEHICLE_SPECS[vehicleId] || VEHICLE_SPECS[VehicleId.ClassicVan];
  const bonus = getUpgradeBonuses();
  return {
    ...base,
    maxSpeedMult: base.maxSpeedMult * bonus.maxSpeedMult,
    accelMult: base.accelMult * bonus.accelMult,
    turnSpeedMult: base.turnSpeedMult * bonus.turnSpeedMult,
    smallTossRangeBonus: base.smallTossRangeBonus + bonus.smallTossRangeBonus,
  };
}
