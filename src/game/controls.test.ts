import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HANDLING_PRESETS,
  HANDLING_PROFILES,
  VIEW_FRAMING,
  VIEW_MODES,
  cycleViewMode,
  getHandling,
  getHandlingPreset,
  getViewMode,
  setHandlingPreset,
  setViewMode,
} from './controls';

test('new players start in the wide framing and balanced handling', () => {
  assert.equal(getViewMode(), 'far');
  assert.equal(getHandlingPreset(), 'balanced');
  assert.equal(getHandling(), HANDLING_PROFILES.balanced);
});

test('cycling the view walks chase -> far -> top -> hood -> cockpit -> chase', () => {
  assert.deepEqual(VIEW_MODES, ['chase', 'far', 'top', 'hood', 'cockpit']);
  setViewMode('chase');
  assert.equal(cycleViewMode(), 'far');
  assert.equal(cycleViewMode(), 'top');
  assert.equal(cycleViewMode(), 'hood');
  assert.equal(cycleViewMode(), 'cockpit');
  assert.equal(cycleViewMode(), 'chase');
});

test('unknown view or handling values fall back to the friendly defaults', () => {
  // @ts-expect-error deliberately invalid
  assert.equal(setViewMode('nope'), 'far');
  // @ts-expect-error deliberately invalid
  assert.equal(setHandlingPreset('nope'), 'balanced');
});

test('framing presets spread out monotonically from chase to top', () => {
  assert.deepEqual(VIEW_FRAMING.chase, { back: 1, up: 1, lookAhead: 1, fov: 1 });
  assert.ok(VIEW_FRAMING.far.back > 1 && VIEW_FRAMING.far.up > 1);
  assert.ok(VIEW_FRAMING.top.up > VIEW_FRAMING.far.up);
  assert.ok(VIEW_FRAMING.top.back < VIEW_FRAMING.far.back);
  assert.ok(VIEW_FRAMING.top.fov < VIEW_FRAMING.far.fov);
});

test('balanced handling is calmer than arcade across every axis', () => {
  const balanced = HANDLING_PROFILES.balanced;
  const arcade = HANDLING_PROFILES.arcade;
  assert.deepEqual(HANDLING_PRESETS, ['balanced', 'arcade']);
  assert.ok(balanced.turnSpeedRad < arcade.turnSpeedRad);
  assert.ok(balanced.highSpeedTurnMult < arcade.highSpeedTurnMult);
  assert.ok(balanced.accelExp < arcade.accelExp);
  assert.ok(balanced.boostAccelExp < arcade.boostAccelExp);
  assert.ok(balanced.coastDrag < arcade.coastDrag);
  assert.ok(balanced.steerSmoothSec > 0);
  assert.equal(balanced.steerAssistThrottle, 0);
  assert.equal(arcade.steerSmoothSec, 0);
  assert.equal(arcade.steerAssistThrottle, 0.68);
});

test('selecting a preset switches the profile the simulation reads', () => {
  setHandlingPreset('arcade');
  assert.equal(getHandling().turnSpeedRad, HANDLING_PROFILES.arcade.turnSpeedRad);
  setHandlingPreset('balanced');
  assert.equal(getHandling().coastDrag, HANDLING_PROFILES.balanced.coastDrag);
});
