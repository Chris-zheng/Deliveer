import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DIFFICULTY_INDICATOR,
  HANDLING_LABELS,
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

test('handling difficulty tiers progress smoothly: beginner -> balanced -> arcade', () => {
  const beginner = HANDLING_PROFILES.beginner;
  const balanced = HANDLING_PROFILES.balanced;
  const arcade = HANDLING_PROFILES.arcade;
  assert.deepEqual(HANDLING_PRESETS, ['beginner', 'balanced', 'arcade']);

  // Beginner is calmer, slower, more forgiving, and stronger at straightening out
  assert.ok(beginner.maxSpeedScale < balanced.maxSpeedScale);
  assert.ok(beginner.turnSpeedRad < balanced.turnSpeedRad);
  assert.ok(beginner.accelExp < balanced.accelExp);
  assert.ok(beginner.steerSmoothSec > balanced.steerSmoothSec);
  assert.ok(beginner.steerAssistThrottle > 0);
  assert.ok(beginner.autoAlignRad > balanced.autoAlignRad);
  assert.ok(beginner.autoAlignRate > balanced.autoAlignRate);
  assert.ok(beginner.laneCenterRate > balanced.laneCenterRate);
  assert.ok(beginner.curbBounceSpeed > balanced.curbBounceSpeed);
  assert.ok(beginner.wrongWayRateScale < balanced.wrongWayRateScale);

  // Balanced sits between beginner and arcade across primary axes
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

test('difficulty indicator maps handling presets to Beginner, Normal, and Pro cleanly', () => {
  assert.equal(HANDLING_LABELS.beginner.en, 'Beginner');
  assert.equal(HANDLING_LABELS.balanced.en, 'Normal');
  assert.equal(HANDLING_LABELS.arcade.en, 'Pro');
  assert.equal(DIFFICULTY_INDICATOR.beginner.labelEn, 'Beginner');
  assert.equal(DIFFICULTY_INDICATOR.balanced.labelEn, 'Normal');
  assert.equal(DIFFICULTY_INDICATOR.arcade.labelEn, 'Pro');
  assert.equal(DIFFICULTY_INDICATOR.beginner.bars, 1);
  assert.equal(DIFFICULTY_INDICATOR.balanced.bars, 2);
  assert.equal(DIFFICULTY_INDICATOR.arcade.bars, 3);
});

test('selecting a preset switches the profile the simulation reads', () => {
  setHandlingPreset('beginner');
  assert.equal(getHandling().maxSpeedScale, HANDLING_PROFILES.beginner.maxSpeedScale);
  setHandlingPreset('arcade');
  assert.equal(getHandling().turnSpeedRad, HANDLING_PROFILES.arcade.turnSpeedRad);
  setHandlingPreset('balanced');
  assert.equal(getHandling().coastDrag, HANDLING_PROFILES.balanced.coastDrag);
});

