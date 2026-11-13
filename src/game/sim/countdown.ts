/**
 * src/game/sim/countdown.ts
 *
 * Extracted verbatim from src/game/rules.ts — no logic changes.
 * Public API is re-exported by src/game/rules.ts.
 */

import {
  CountdownStage,
  RocketStartStatus,
  TruckState,
} from '../types';

import {
  ROCKET_START_BOOST_SEC,
  TRUCK_BOOST_SPEED,
} from '../../config/balance';

import {
  quinticSmoothstep,
} from './geometry';

/**
 * Pure 3 - 2 - 1 - GO! Bird's-Eye Camera Swoop & Rocket Start Timing Mini-Game State Machine
 */
export type CountdownMode = 'full' | 'quick' | 'instant';

export interface StartCountdownState {
  mode: CountdownMode;
  totalSec: number;
  remainingSec: number; // > 0 during 3..2..1, <= 0 once GO! unlocks driving
  goHoldSec: number; // > 0 while "GO!" badge stays on screen after unlock
  stage: CountdownStage;
  isFrozen: boolean; // True while 3..2..1 is counting down (shift timer & truck motion paused)
  swoopAlpha: number; // 0 = high bird's-eye island overview, 1 = locked into chase camera
  earlyLocked: boolean; // True if throttle was mashed too early without releasing
  primed: boolean; // True if throttle was timed cleanly in the "1" sweet-spot window
  rocketStatus: RocketStartStatus;
}

export interface CountdownStepEvents {
  changedStage: CountdownStage;
  justUnlockedGo: boolean;
  triggeredRocketStart: boolean;
  triggeredSputter: boolean;
  revIntensity: number; // > 0 when van should rumble & puff exhaust during countdown
}


export function createStartCountdownState(
  mode: CountdownMode = 'full',
): StartCountdownState {
  if (mode === 'instant') {
    return {
      mode,
      totalSec: 0,
      remainingSec: 0,
      goHoldSec: 0,
      stage: null,
      isFrozen: false,
      swoopAlpha: 1,
      earlyLocked: false,
      primed: false,
      rocketStatus: 'idle',
    };
  }
  const totalSec = mode === 'quick' ? 1.5 : 2.4;
  return {
    mode,
    totalSec,
    remainingSec: totalSec,
    goHoldSec: mode === 'quick' ? 0.48 : 0.62,
    stage: 3,
    isFrozen: true,
    swoopAlpha: 0,
    earlyLocked: false,
    primed: false,
    rocketStatus: 'idle',
  };
}

function stepStartCountdownSingle(
  state: StartCountdownState,
  throttleHeld: boolean,
  clampedDt: number,
): CountdownStepEvents {
  const prevStage = state.stage;
  let changedStage: CountdownStage = null;
  let justUnlockedGo = false;
  let triggeredRocketStart = false;
  let triggeredSputter = false;
  let revIntensity = 0;

  if (!state.isFrozen) {
    state.swoopAlpha = 1;
    if (state.goHoldSec > 0) {
      state.goHoldSec = Math.max(0, state.goHoldSec - clampedDt);
      state.stage = state.goHoldSec > 0 ? 0 : null;
      if (state.stage !== prevStage) {
        changedStage = state.stage;
      }
    } else {
      state.stage = null;
    }
    return {
      changedStage,
      justUnlockedGo: false,
      triggeredRocketStart: false,
      triggeredSputter: false,
      revIntensity: 0,
    };
  }

  const beatLen = Math.max(0.25, state.totalSec / 3);
  const sweetSpotThreshold = beatLen * 1.15; // Sweet spot opens right around "1" appearing!

  // Evaluate Rocket Start throttle timing before stepping remainingSec
  if (!throttleHeld) {
    // Releasing gas clears an early-mash lock so skilled players can recover before "1"!
    state.earlyLocked = false;
    state.primed = false;
    state.rocketStatus = state.remainingSec <= sweetSpotThreshold ? 'ready' : 'idle';
  } else if (state.remainingSec > sweetSpotThreshold + 0.16 && !state.primed) {
    if (!state.earlyLocked) {
      triggeredSputter = true;
    }
    state.earlyLocked = true;
    state.rocketStatus = 'sputter';
  } else if (!state.earlyLocked && state.remainingSec <= sweetSpotThreshold) {
    state.primed = true;
    state.rocketStatus = 'primed';
    revIntensity = 1.25;
  }

  state.remainingSec = Math.max(0, state.remainingSec - clampedDt);
  const rawProgress =
    state.totalSec > 0 ? 1 - state.remainingSec / state.totalSec : 1;
  // Hold slightly high over the island for the first 18% so the full city reads clearly, then dive smoothly!
  const diveT = Math.max(0, (rawProgress - 0.14) / 0.86);
  state.swoopAlpha = quinticSmoothstep(diveT);

  if (state.remainingSec <= 0) {
    state.isFrozen = false;
    state.swoopAlpha = 1;
    state.stage = 0;
    justUnlockedGo = true;
    changedStage = 0;

    if (state.primed && !state.earlyLocked) {
      triggeredRocketStart = true;
      state.rocketStatus = 'launched';
    } else if (state.earlyLocked) {
      triggeredSputter = true;
      state.rocketStatus = 'sputter';
    } else {
      state.rocketStatus = 'idle';
    }
  } else {
    const nextStage: 3 | 2 | 1 =
      state.remainingSec > beatLen * 2
        ? 3
        : state.remainingSec > beatLen
          ? 2
          : 1;
    state.stage = nextStage;
    if (nextStage !== prevStage) {
      changedStage = nextStage;
    }
    if (revIntensity === 0 && (nextStage === 2 || nextStage === 1)) {
      revIntensity = nextStage === 1 ? 0.95 : 0.65;
    }
    if (!throttleHeld && state.remainingSec <= sweetSpotThreshold) {
      state.rocketStatus = 'ready';
    }
  }

  return {
    changedStage,
    justUnlockedGo,
    triggeredRocketStart,
    triggeredSputter,
    revIntensity,
  };
}

export function stepStartCountdown(
  state: StartCountdownState,
  throttleHeld: boolean,
  dt: number,
): CountdownStepEvents {
  const totalDt = Math.max(0, Math.min(dt, 0.35));
  if (totalDt <= 0.1) {
    return stepStartCountdownSingle(state, throttleHeld, totalDt);
  }
  const steps = Math.ceil(totalDt / 0.1);
  const subDt = totalDt / steps;
  const startStage = state.stage;
  let justUnlockedGo = false;
  let triggeredRocketStart = false;
  let triggeredSputter = false;
  let revIntensity = 0;

  for (let i = 0; i < steps; i++) {
    const sub = stepStartCountdownSingle(state, throttleHeld, subDt);
    if (sub.justUnlockedGo) justUnlockedGo = true;
    if (sub.triggeredRocketStart) triggeredRocketStart = true;
    if (sub.triggeredSputter) triggeredSputter = true;
    revIntensity = Math.max(revIntensity, sub.revIntensity);
  }

  return {
    changedStage: state.stage !== startStage ? state.stage : null,
    justUnlockedGo,
    triggeredRocketStart,
    triggeredSputter,
    revIntensity,
  };
}

export function applyRocketStartToTruck(truck: TruckState): void {
  truck.boostTimer = Math.max(truck.boostTimer, ROCKET_START_BOOST_SEC);
  truck.boostCooldown = 0;
  const launchSpd = TRUCK_BOOST_SPEED * 0.88;
  truck.speed = launchSpd;
  truck.vx = Math.sin(truck.yaw) * launchSpd;
  truck.vz = Math.cos(truck.yaw) * launchSpd;
  truck.pitchAngle = -0.15; // Joyful mini wheelie pitch hop!
  truck.squashY = 0.78;
  truck.squashVel = 3.9;
}
