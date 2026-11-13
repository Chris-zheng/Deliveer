import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CROSSING_WARNING_SEC,
  MIN_SPAWN_CLEARANCE,
  RIVAL_SPEED_RATIO,
  SAME_SPOT_RADIUS,
  isCrossingHazard,
  isCrossingWarningActive,
  pickFairStarts,
  warningPulse,
} from './hazardWarning';
import { HazardKind, HazardPhase } from './types';
import type { TrafficHazard } from './types';

function hazard(overrides: Partial<TrafficHazard>): TrafficHazard {
  return {
    id: 'h',
    kind: HazardKind.ScooterDash,
    phase: HazardPhase.Idle,
    phaseTimer: 1,
    x: 0,
    z: 0,
    yaw: 0,
    speed: 5,
    currentSpeed: 0,
    colorHex: 0xffffff,
    waypoints: [],
    waypointIndex: 0,
    dashStart: { x: 0, z: 0 },
    dashEnd: { x: 1, z: 0 },
    ...overrides,
  } as TrafficHazard;
}

test('crossing warning window fits the 0.6-0.9s readability budget', () => {
  assert.ok(CROSSING_WARNING_SEC >= 0.6 && CROSSING_WARNING_SEC <= 0.9);
});

test('only a winding-up scooter counts as a live crossing warning', () => {
  assert.equal(isCrossingHazard(hazard({})), true);
  assert.equal(isCrossingHazard(hazard({ kind: HazardKind.Cruiser })), false);
  assert.equal(isCrossingWarningActive(hazard({ phase: HazardPhase.Windup })), true);
  assert.equal(isCrossingWarningActive(hazard({ phase: HazardPhase.Active })), false);
  assert.equal(
    isCrossingWarningActive(hazard({ kind: HazardKind.Cruiser, phase: HazardPhase.Windup })),
    false,
  );
});

test('warning pulse stays inside a readable opacity band', () => {
  for (let t = 0; t < 4; t += 0.05) {
    const v = warningPulse(t);
    assert.ok(v >= 0.29 && v <= 0.73, `opacity ${v} out of band`);
  }
});

test('rival van is capped at 75% of the player top speed', () => {
  assert.equal(RIVAL_SPEED_RATIO, 0.75);
});

test('pickFairStarts keeps spawn-adjacent and crowded starts out of the level', () => {
  const spawn = { x: 0, z: 0 };
  const candidates = [
    { id: 'too-close', p: { x: 2, z: 0 } },
    { id: 'fair-a', p: { x: MIN_SPAWN_CLEARANCE + 1, z: 0 } },
    { id: 'fair-a-clone', p: { x: MIN_SPAWN_CLEARANCE + 1 + SAME_SPOT_RADIUS / 2, z: 0 } },
    { id: 'fair-b', p: { x: 0, z: MIN_SPAWN_CLEARANCE + 2 } },
  ];
  const picked = pickFairStarts(candidates, (c) => c.p, spawn, 5);
  assert.deepEqual(
    picked.map((c) => c.id),
    ['fair-a', 'fair-b'],
  );
});

test('pickFairStarts honours the requested count', () => {
  const spawn = { x: 0, z: 0 };
  const candidates = Array.from({ length: 6 }, (_, i) => ({
    id: `c${i}`,
    p: { x: 20 + i * 8, z: 0 },
  }));
  assert.equal(pickFairStarts(candidates, (c) => c.p, spawn, 3).length, 3);
});