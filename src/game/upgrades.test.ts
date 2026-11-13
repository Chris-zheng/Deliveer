import { describe, expect, test } from 'bun:test';
import {
  applyUpgradeLevels,
  computeUpgradeBonuses,
  createDefaultUpgradeLevels,
  MAX_UPGRADE_LEVEL,
  normalizeUpgradeLevels,
  purchaseUpgrade,
  resolveVehicleSpec,
  totalUpgradeSpend,
  UPGRADE_TRACK_ORDER,
  UPGRADE_TRACKS,
} from './upgrades';
import { createDefaultProgression, VEHICLE_SPECS } from './progression';
import { PlayerProgression, VehicleId } from './types';

describe('garage upgrades', () => {
  test('defaults grant no bonuses', () => {
    const bonus = computeUpgradeBonuses(createDefaultUpgradeLevels());
    expect(bonus.maxSpeedMult).toBe(1);
    expect(bonus.accelMult).toBe(1);
    expect(bonus.turnSpeedMult).toBe(1);
    expect(bonus.smallTossRangeBonus).toBe(0);
    expect(bonus.thermalBonusSec).toBe(0);
  });

  test('tier 3 applies the advertised percentages', () => {
    const bonus = computeUpgradeBonuses({ engine: 3, tires: 3, cargo: 3 });
    expect(bonus.maxSpeedMult).toBeCloseTo(1.2, 5);
    expect(bonus.accelMult).toBeCloseTo(1.26, 5);
    expect(bonus.turnSpeedMult).toBeCloseTo(1.25, 5);
    expect(bonus.smallTossRangeBonus).toBeCloseTo(1.3, 5);
    expect(bonus.thermalBonusSec).toBe(20);
  });

  test('levels are clamped and normalised from junk saves', () => {
    expect(normalizeUpgradeLevels({ engine: 9, tires: -3, cargo: 1.8 })).toEqual({
      engine: MAX_UPGRADE_LEVEL,
      tires: 0,
      cargo: 1,
    });
    expect(normalizeUpgradeLevels(null)).toEqual({ engine: 0, tires: 0, cargo: 0 });
  });

  test('purchasing spends coins and raises exactly one track', () => {
    const base: PlayerProgression = { ...createDefaultProgression(), coins: 1000 };
    const bought = purchaseUpgrade(base, 'engine');
    expect(bought.reason).toBe('purchased');
    expect(bought.tier?.costCoins).toBe(700);
    expect(bought.progression.coins).toBe(300);
    expect(bought.progression.upgrades).toEqual({ engine: 1, tires: 0, cargo: 0 });
    expect(base.upgrades).toEqual({ engine: 0, tires: 0, cargo: 0 });
  });

  test('purchasing refuses when broke and when maxed out', () => {
    const broke: PlayerProgression = { ...createDefaultProgression(), coins: 10 };
    const denied = purchaseUpgrade(broke, 'cargo');
    expect(denied.reason).toBe('insufficient');
    expect(denied.progression.coins).toBe(10);

    const maxed: PlayerProgression = {
      ...createDefaultProgression(),
      coins: 99999,
      upgrades: { engine: 3, tires: 3, cargo: 3 },
    };
    expect(purchaseUpgrade(maxed, 'engine').reason).toBe('maxed');
    expect(purchaseUpgrade(maxed, 'engine').progression.coins).toBe(99999);
  });

  test('the full tree is a long-term sink, not pocket change', () => {
    const total = totalUpgradeSpend({ engine: 3, tires: 3, cargo: 3 });
    expect(total).toBe(13800);
    UPGRADE_TRACK_ORDER.forEach((track) => {
      expect(UPGRADE_TRACKS[track].tiers).toHaveLength(MAX_UPGRADE_LEVEL);
    });
  });

  test('resolveVehicleSpec folds the applied levels into the vehicle spec', () => {
    applyUpgradeLevels({ engine: 3, tires: 0, cargo: 0 });
    const upgraded = resolveVehicleSpec(VehicleId.ClassicVan);
    const base = VEHICLE_SPECS[VehicleId.ClassicVan];
    expect(upgraded.maxSpeedMult).toBeCloseTo(base.maxSpeedMult * 1.2, 5);
    expect(upgraded.turnSpeedMult).toBeCloseTo(base.turnSpeedMult, 5);
    applyUpgradeLevels(createDefaultUpgradeLevels());
    expect(resolveVehicleSpec(VehicleId.ClassicVan).maxSpeedMult).toBeCloseTo(
      base.maxSpeedMult,
      5,
    );
  });
});
