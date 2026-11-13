import test from 'node:test';
import assert from 'node:assert/strict';
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

test('garage upgrades: defaults grant no bonuses', () => {
  const bonus = computeUpgradeBonuses(createDefaultUpgradeLevels());
  assert.equal(bonus.maxSpeedMult, 1);
  assert.equal(bonus.accelMult, 1);
  assert.equal(bonus.turnSpeedMult, 1);
  assert.equal(bonus.smallTossRangeBonus, 0);
  assert.equal(bonus.thermalBonusSec, 0);
});

test('garage upgrades: tier 3 applies the advertised percentages', () => {
  const bonus = computeUpgradeBonuses({ engine: 3, tires: 3, cargo: 3 });
  assert.ok(Math.abs(bonus.maxSpeedMult - 1.2) < 1e-6);
  assert.ok(Math.abs(bonus.accelMult - 1.26) < 1e-6);
  assert.ok(Math.abs(bonus.turnSpeedMult - 1.25) < 1e-6);
  assert.ok(Math.abs(bonus.smallTossRangeBonus - 1.3) < 1e-6);
  assert.equal(bonus.thermalBonusSec, 20);
});

test('garage upgrades: levels are clamped and normalised from junk saves', () => {
  assert.deepEqual(normalizeUpgradeLevels({ engine: 9, tires: -3, cargo: 1.8 }), {
    engine: MAX_UPGRADE_LEVEL,
    tires: 0,
    cargo: 1,
  });
  assert.deepEqual(normalizeUpgradeLevels(null), { engine: 0, tires: 0, cargo: 0 });
});

test('garage upgrades: purchasing spends coins and raises exactly one track', () => {
  const base: PlayerProgression = { ...createDefaultProgression(), coins: 1000 };
  const bought = purchaseUpgrade(base, 'engine');
  assert.equal(bought.reason, 'purchased');
  assert.equal(bought.tier?.costCoins, 700);
  assert.equal(bought.progression.coins, 300);
  assert.deepEqual(bought.progression.upgrades, { engine: 1, tires: 0, cargo: 0 });
  assert.deepEqual(base.upgrades, { engine: 0, tires: 0, cargo: 0 });
});

test('garage upgrades: purchasing refuses when broke and when maxed out', () => {
  const broke: PlayerProgression = { ...createDefaultProgression(), coins: 10 };
  const denied = purchaseUpgrade(broke, 'cargo');
  assert.equal(denied.reason, 'insufficient');
  assert.equal(denied.progression.coins, 10);

  const maxed: PlayerProgression = {
    ...createDefaultProgression(),
    coins: 99999,
    upgrades: { engine: 3, tires: 3, cargo: 3 },
  };
  assert.equal(purchaseUpgrade(maxed, 'engine').reason, 'maxed');
  assert.equal(purchaseUpgrade(maxed, 'engine').progression.coins, 99999);
});

test('garage upgrades: the full tree is a long-term sink, not pocket change', () => {
  assert.equal(totalUpgradeSpend({ engine: 3, tires: 3, cargo: 3 }), 13800);
  UPGRADE_TRACK_ORDER.forEach((track) => {
    assert.equal(UPGRADE_TRACKS[track].tiers.length, MAX_UPGRADE_LEVEL);
  });
});

test('garage upgrades: resolveVehicleSpec folds the applied levels into the spec', () => {
  applyUpgradeLevels({ engine: 3, tires: 0, cargo: 0 });
  const upgraded = resolveVehicleSpec(VehicleId.ClassicVan);
  const base = VEHICLE_SPECS[VehicleId.ClassicVan];
  assert.ok(Math.abs(upgraded.maxSpeedMult - base.maxSpeedMult * 1.2) < 1e-6);
  assert.ok(Math.abs(upgraded.turnSpeedMult - base.turnSpeedMult) < 1e-6);
  applyUpgradeLevels(createDefaultUpgradeLevels());
  assert.ok(
    Math.abs(resolveVehicleSpec(VehicleId.ClassicVan).maxSpeedMult - base.maxSpeedMult) < 1e-6,
  );
});
