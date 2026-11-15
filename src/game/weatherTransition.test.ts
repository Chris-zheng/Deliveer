import test from 'node:test';
import assert from 'node:assert/strict';
import { ShiftAtmosphere } from './types';
import {
  createWeatherVisualState,
  isSnowyAtmosphereCity,
  resetWeatherVisualState,
  stepWeatherVisualState,
  triggerPlayingPhaseTransition,
} from './weatherTransition';

test('weatherTransition: Playing phase shift swells and gracefully decays breeze particles on clear skies', () => {
  const state = createWeatherVisualState(ShiftAtmosphere.SunnyHarbor);
  triggerPlayingPhaseTransition(state, 2.0);
  assert.ok(state.phaseBurstTimer > 1.9);

  let peakBreeze = 0;
  for (let i = 0; i < 12; i++) {
    stepWeatherVisualState(state, {
      kind: 'clear',
      hasSunshower: false,
      atmosphere: ShiftAtmosphere.SunnyHarbor,
      dt: 0.05,
    });
    peakBreeze = Math.max(peakBreeze, state.breezeOpacity);
  }
  assert.ok(peakBreeze > 0.45, 'Expected visible phase-shift transition breeze particles');
  assert.equal(state.rainOpacity, 0);

  for (let i = 0; i < 40; i++) {
    stepWeatherVisualState(state, {
      kind: 'clear',
      hasSunshower: false,
      atmosphere: ShiftAtmosphere.SunnyHarbor,
      dt: 0.05,
    });
  }
  assert.equal(state.phaseBurstTimer, 0);
  assert.equal(state.breezeOpacity, 0);
});

test('weatherTransition: rain ramps streak opacity and tightens fog smoothly', () => {
  const state = createWeatherVisualState(ShiftAtmosphere.SunnyHarbor);
  const clearNear = state.fogNear;

  stepWeatherVisualState(state, {
    kind: 'rain',
    hasSunshower: false,
    atmosphere: ShiftAtmosphere.SunnyHarbor,
    dt: 0.05,
  });
  // First step moves partially toward rain rather than snapping to 1 immediately.
  assert.ok(state.rainMix > 0.05 && state.rainMix < 0.35);

  for (let i = 0; i < 50; i++) {
    stepWeatherVisualState(state, {
      kind: 'rain',
      hasSunshower: false,
      atmosphere: ShiftAtmosphere.SunnyHarbor,
      dt: 0.05,
    });
  }
  assert.ok(state.rainMix > 0.95);
  assert.ok(state.rainOpacity > 0.55);
  assert.ok(state.fogNear < clearNear - 15);
  assert.equal(state.flakeOpacity, 0);
});

test('weatherTransition: fog ramps flake/snow opacity and narrows visibility without rain streaks', () => {
  const state = createWeatherVisualState(ShiftAtmosphere.GoldenSunset);
  for (let i = 0; i < 50; i++) {
    stepWeatherVisualState(state, {
      kind: 'fog',
      hasSunshower: false,
      atmosphere: ShiftAtmosphere.GoldenSunset,
      cityId: 'beijing',
      dt: 0.05,
    });
  }
  assert.ok(state.fogMix > 0.95);
  assert.ok(state.flakeOpacity > 0.65);
  assert.equal(state.rainOpacity, 0);
  assert.ok(state.fogFar < 60);
  assert.equal(state.snowFlakeStyle, true);
  assert.equal(isSnowyAtmosphereCity('singapore'), false);
});

test('weatherTransition: paused state freezes blend progression cleanly', () => {
  const state = createWeatherVisualState(ShiftAtmosphere.TwilightNeon);
  triggerPlayingPhaseTransition(state, 2.0);
  stepWeatherVisualState(state, {
    kind: 'rain',
    hasSunshower: false,
    atmosphere: ShiftAtmosphere.TwilightNeon,
    dt: 0.1,
  });
  const snapRain = state.rainMix;
  const snapTimer = state.phaseBurstTimer;

  stepWeatherVisualState(state, {
    kind: 'rain',
    hasSunshower: false,
    atmosphere: ShiftAtmosphere.TwilightNeon,
    dt: 0.1,
    isPaused: true,
  });
  assert.equal(state.rainMix, snapRain);
  assert.equal(state.phaseBurstTimer, snapTimer);
});

test('weatherTransition: resetWeatherVisualState restores clean initial conditions', () => {
  const state = createWeatherVisualState(ShiftAtmosphere.SunnyHarbor);
  triggerPlayingPhaseTransition(state, 2.0);
  stepWeatherVisualState(state, {
    kind: 'rain',
    hasSunshower: true,
    atmosphere: ShiftAtmosphere.SunnyHarbor,
    dt: 0.5,
  });
  resetWeatherVisualState(state, ShiftAtmosphere.TwilightNeon, 'clear', false, 'tokyo');
  assert.equal(state.rainMix, 0);
  assert.equal(state.fogMix, 0);
  assert.equal(state.phaseBurstTimer, 0);
  assert.equal(state.rainOpacity, 0);
  assert.equal(state.fogNear, 54);
});
