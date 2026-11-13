import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CONTINENTS,
  WORLD_CITIES,
  buildWorldCityLevelConfig,
  getCityEarnedStars,
  getTotalWorldStars,
  getWorldCityById,
  isWorldCityUnlocked,
} from './worldCities';
import {
  createDefaultProgression,
  recordLoreDiscovery,
  recordWorldStageStars,
} from './progression';
import { generateProceduralCity } from './proceduralCity';
import { createInitialTruckState, stepTruckPhysics } from './rules';
import { DRIFT_TIER1_SEC, DRIFT_TIER2_SEC } from '../config/balance';

test('worldCities: contains 20 cities across 6 continents, 10 stages, 6 dishes & 2 landmarks each', () => {
  assert.equal(WORLD_CITIES.length, 20);
  const coveredContinents = new Set(WORLD_CITIES.map((c) => c.continent));
  for (const cont of CONTINENTS) {
    assert.ok(coveredContinents.has(cont.id), `Missing continent ${cont.id}`);
  }

  const allLoreIds = new Set<string>();
  for (const city of WORLD_CITIES) {
    assert.equal(city.stages.length, 10, `${city.id} should have 10 stages`);
    assert.equal(city.dishes.length, 6, `${city.id} should have 6 signature dishes`);
    assert.equal(city.landmarks.length, 2, `${city.id} should have 2 landmarks`);
    assert.ok(city.streetsZh.length >= 6 && city.streetsEn.length >= 6);

    for (let i = 0; i < 10; i++) {
      assert.equal(city.stages[i].stage, i + 1);
    }
    for (const d of city.dishes) {
      assert.ok(!allLoreIds.has(d.loreId), `Duplicate loreId ${d.loreId}`);
      allLoreIds.add(d.loreId);
    }
    for (const lm of city.landmarks) {
      assert.ok(!allLoreIds.has(lm.loreId), `Duplicate loreId ${lm.loreId}`);
      allLoreIds.add(lm.loreId);
    }
  }
  assert.equal(allLoreIds.size, 160);
});

test('worldCities: stage generation wires curated streets, dishes, and landmarks', () => {
  const tokyo = getWorldCityById('tokyo');
  assert.ok(tokyo);
  const cfg = buildWorldCityLevelConfig(tokyo, 4);
  const generated = generateProceduralCity(cfg.level, undefined, cfg);

  assert.equal(generated.config.customCity?.worldCityId, 'tokyo');
  assert.equal(generated.config.customCity?.worldStage, 4);
  assert.ok(generated.landmarks && generated.landmarks.length >= 1);
  assert.ok(generated.stops.every((s) => Boolean(s.loreId && s.loreFactZh && s.loreFactEn)));
});

test('progression: star unlock gates and almanac discovery tracking work deterministically', () => {
  let prog = createDefaultProgression();
  const cairo = getWorldCityById('cairo');
  const paris = getWorldCityById('paris');
  assert.ok(cairo && paris);

  assert.equal(isWorldCityUnlocked(paris, prog), true);
  assert.equal(isWorldCityUnlocked(cairo, prog), false);

  for (let st = 1; st <= 3; st++) {
    prog = recordWorldStageStars(prog, 'beijing', st, 3);
  }
  assert.equal(getCityEarnedStars('beijing', prog), 9);
  assert.equal(getTotalWorldStars(prog), 9);
  assert.equal(isWorldCityUnlocked(cairo, prog), true);

  const first = recordLoreDiscovery(prog, 'bj_duck');
  assert.equal(first.isFirstDiscovery, true);
  const second = recordLoreDiscovery(first.next, 'bj_duck');
  assert.equal(second.isFirstDiscovery, false);
});

test('truck physics: 2-stage drift mini-turbo awards Tier 1 (cyan) and Tier 2 (gold) boosts on release', () => {
  const city = generateProceduralCity(1);
  const truck1 = createInitialTruckState(city);
  truck1.speed = 6.5;
  truck1.isDrifting = true;
  truck1.driftChargeAccum = DRIFT_TIER1_SEC + 0.05;
  const ev1 = stepTruckPhysics(
    truck1,
    { throttle: 1, steer: 0, wantsBoost: false, wantsDrift: false },
    city,
    0.016,
  );
  assert.equal(ev1.driftMiniTurbo, 1);
  assert.ok(truck1.boostTimer > 0);

  const truck2 = createInitialTruckState(city);
  truck2.speed = 6.5;
  truck2.isDrifting = true;
  truck2.driftChargeAccum = DRIFT_TIER2_SEC + 0.05;
  const ev2 = stepTruckPhysics(
    truck2,
    { throttle: 1, steer: 0, wantsBoost: false, wantsDrift: false },
    city,
    0.016,
  );
  assert.equal(ev2.driftMiniTurbo, 2);
  assert.ok(truck2.boostTimer > 0.5);
});

test('audio: playDiscoveryChime handles new landmark and parcel cues safely', async () => {
  const { pokoAudio } = await import('./audio');
  assert.equal(typeof pokoAudio.playDiscoveryChime, 'function');
  assert.doesNotThrow(() => {
    pokoAudio.playDiscoveryChime('landmark', true);
    pokoAudio.playDiscoveryChime('landmark', false);
    pokoAudio.playDiscoveryChime('parcel', true);
    pokoAudio.playLandmarkDiscovery();
  });
});

test('audio: ambient soundscapes resolve distinct regions by city and district atmosphere', async () => {
  const { pokoAudio, resolveAmbientSoundscape } = await import('./audio');
  const { ShiftAtmosphere } = await import('./types');

  assert.equal(
    resolveAmbientSoundscape(ShiftAtmosphere.SunnyHarbor, { worldCityId: 'barcelona' }).region,
    'mediterranean_coast',
  );
  assert.equal(
    resolveAmbientSoundscape(ShiftAtmosphere.TwilightNeon, { worldCityId: 'tokyo' }).region,
    'asian_metropolis',
  );
  assert.equal(
    resolveAmbientSoundscape(ShiftAtmosphere.GoldenSunset, { worldCityId: 'paris' }).region,
    'european_plaza',
  );
  assert.equal(
    resolveAmbientSoundscape(ShiftAtmosphere.TwilightNeon, { worldCityId: 'newyork' }).region,
    'americas_metro',
  );
  assert.equal(
    resolveAmbientSoundscape(ShiftAtmosphere.GoldenSunset, { worldCityId: 'cairo' }).region,
    'desert_oasis',
  );

  // Fallback by district atmosphere when no custom city is present
  assert.equal(
    resolveAmbientSoundscape(ShiftAtmosphere.SunnyHarbor).region,
    'mediterranean_coast',
  );
  assert.equal(
    resolveAmbientSoundscape(ShiftAtmosphere.TwilightNeon).region,
    'asian_metropolis',
  );

  assert.doesNotThrow(() => {
    pokoAudio.setDistrictAtmosphere(ShiftAtmosphere.GoldenSunset, {
      worldCityId: 'rome',
      cityName: '罗马',
      cityNameEn: 'Rome',
    });
  });
  const active = pokoAudio.getActiveSoundscape();
  assert.equal(active.region, 'mediterranean_coast');
  assert.equal(active.atmosphere, ShiftAtmosphere.GoldenSunset);
});
