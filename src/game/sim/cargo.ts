/**
 * src/game/sim/cargo.ts
 *
 * Extracted verbatim from src/game/rules.ts — no logic changes.
 * Public API is re-exported by src/game/rules.ts.
 */

import {
  TruckState,
} from '../types';

import {
  TRUCK_MAX_SPEED,
} from '../../config/balance';

import {
  wrapAngleRad,
} from './geometry';

/**
 * Pure Roof-Rack Parcel Stack Spring-Damper Wobble Physics
 */
export interface ParcelStackWobbleState {
  roll: number;
  rollVel: number;
  pitch: number;
  pitchVel: number;
  bounceY: number;
  bounceVel: number;
  prevYaw: number;
  prevSpeed: number;
  wasAirborne: boolean;
}

export function createParcelStackWobbleState(
  initialYaw: number = 0,
): ParcelStackWobbleState {
  return {
    roll: 0,
    rollVel: 0,
    pitch: 0,
    pitchVel: 0,
    bounceY: 0,
    bounceVel: 0,
    prevYaw: initialYaw,
    prevSpeed: 0,
    wasAirborne: false,
  };
}

export function stepParcelStackWobble(
  wobble: ParcelStackWobbleState,
  truck: TruckState,
  dt: number,
): void {
  const clampedDt = Math.max(0.001, Math.min(dt, 0.05));
  const yawDelta = wrapAngleRad(truck.yaw - wobble.prevYaw);
  const yawRate = yawDelta / clampedDt;
  const longAccel = (truck.speed - wobble.prevSpeed) / clampedDt;
  const isAirborne = truck.y > 0.08;

  // Landing bounce impulse when touching down from a Canal Ramp jump!
  if (wobble.wasAirborne && !isAirborne) {
    wobble.bounceVel += 1.65;
    wobble.rollVel += (yawRate >= 0 ? 1 : -1) * 1.4;
  }

  wobble.prevYaw = truck.yaw;
  wobble.prevSpeed = truck.speed;
  wobble.wasAirborne = isAirborne;

  // Centrifugal outward lean on turns + extra sway while drifting
  const speedNorm = Math.min(1.3, truck.speed / TRUCK_MAX_SPEED);
  const driftMult = truck.isDrifting ? 1.45 : 1.0;
  const targetRoll = Math.max(
    -0.42,
    Math.min(0.42, -yawRate * speedNorm * 0.095 * driftMult),
  );
  // Nod forward under braking, tilt back under boost/acceleration
  const targetPitch = Math.max(
    -0.28,
    Math.min(0.28, -longAccel * 0.016),
  );

  const kSpring = 36;
  const cDamp = 6.2;

  const rollAcc = (targetRoll - wobble.roll) * kSpring - wobble.rollVel * cDamp;
  wobble.rollVel += rollAcc * clampedDt;
  wobble.roll = Math.max(-0.5, Math.min(0.5, wobble.roll + wobble.rollVel * clampedDt));

  const pitchAcc =
    (targetPitch - wobble.pitch) * kSpring - wobble.pitchVel * cDamp;
  wobble.pitchVel += pitchAcc * clampedDt;
  wobble.pitch = Math.max(
    -0.36,
    Math.min(0.36, wobble.pitch + wobble.pitchVel * clampedDt),
  );

  const bounceAcc = -wobble.bounceY * 48 - wobble.bounceVel * 7.5;
  wobble.bounceVel += bounceAcc * clampedDt;
  wobble.bounceY = Math.max(
    -0.06,
    Math.min(0.18, wobble.bounceY + wobble.bounceVel * clampedDt),
  );
}

