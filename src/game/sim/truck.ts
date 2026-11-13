/**
 * src/game/sim/truck.ts
 *
 * Extracted verbatim from src/game/rules.ts — no logic changes.
 * Public API is re-exported by src/game/rules.ts.
 */

import {
  CrashEvent,
  GeneratedCity,
  SignalAxisState,
  TicketKind,
  TrafficHazard,
  TruckState,
  VehicleId,
  WorldPos,
} from '../types';

import {
  BOOST_COOLDOWN_MAX_SEC,
  RIGHT_LANE_OFFSET,
  TILE_SIZE,
  TRUCK_BOOST_SPEED,
  TRUCK_MAX_SPEED,
  TRUCK_RADIUS,
  WRONG_WAY_LIMIT_SEC,
} from '../../config/balance';

import {
  getStreetPropObstacleRadius,
  gridToWorld,
  isDrivableTile,
  worldToGrid,
} from '../proceduralCity';

import {
  VEHICLE_SPECS,
} from '../progression';

import {
  countDrivableNeighbors,
  wrapAngleRad,
} from './geometry';

import {
  findBlockingBridgeGate,
  isPositionDrivable,
} from './collision';

export interface TruckInput {
  throttle: number; // -1 (brake to stop; reverse prohibited!) .. +1 (drive straight ahead)
  steer: number; // -1 (turn left) .. +1 (turn right)
  wantsBoost: boolean;
  wantsDrift?: boolean;
}

export function createInitialTruckState(
  city: GeneratedCity,
  vehicleId: VehicleId = VehicleId.ClassicVan,
  startWithShield: boolean = false,
): TruckState {
  const spec = VEHICLE_SPECS[vehicleId] ?? VEHICLE_SPECS[VehicleId.ClassicVan];
  const spawnPos = gridToWorld(city.spawnCoord, city.totalGridSize);
  const rightX = -Math.cos(city.spawnYaw) * RIGHT_LANE_OFFSET;
  const rightZ = Math.sin(city.spawnYaw) * RIGHT_LANE_OFFSET;
  return {
    vehicleId,
    x: spawnPos.x + rightX,
    y: 0,
    z: spawnPos.z + rightZ,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: city.spawnYaw,
    speed: 0,
    isBraking: false,
    isDrifting: false,
    driftChargeAccum: 0,
    boostTimer: 0,
    boostCooldown: 0,
    invulnTimer: 0,
    health: spec.maxHealth,
    maxHealth: spec.maxHealth,
    hasBumperShield: startWithShield,
    shockAbsorberAvailable: spec.hasShockAbsorber,
    greenWaveTimer: 0,
    hornCooldown: 0,
    distanceTraveled: 0,
    squashY: 1,
    squashVel: 0,
    rollAngle: 0,
    pitchAngle: 0,
    steerAngle: 0,
    isWrongWay: false,
    wrongWayTimer: 0,
    ticketCooldown: 0,
    ticketsCount: 0,
    lastSignalCellKey: '',
    fragileIntact: true,
    thermalTimer: 18,
    thermalMaxSec: 18,
    wallCrashCooldown: 0,
  };
}

export interface PhysicsStepResult {
  hitCurb: boolean;
  absorbedCurbWithShock: boolean;
  triggeredBoostPad: boolean;
  activatedManualBoost: boolean;
  activatedJumpRamp: boolean;
  pickedGreenWave: boolean;
  splashedHydrantPos: WorldPos | null;
  issuedTicket: TicketKind | null;
  crashEvents: CrashEvent[];
}

export function stepTruckPhysics(
  truck: TruckState,
  input: TruckInput,
  city: GeneratedCity,
  dt: number,
): PhysicsStepResult {
  const clampedDt = Math.min(dt, 0.05);
  let hitCurb = false;
  let absorbedCurbWithShock = false;
  let triggeredBoostPad = false;
  let activatedManualBoost = false;
  let activatedJumpRamp = false;
  let pickedGreenWave = false;
  let splashedHydrantPos: WorldPos | null = null;
  let issuedTicket: TicketKind | null = null;
  const crashEvents: CrashEvent[] = [];

  const spec = VEHICLE_SPECS[truck.vehicleId] ?? VEHICLE_SPECS[VehicleId.ClassicVan];
  const prevSpeed = truck.speed;
  const prevYaw = truck.yaw;

  if (truck.boostTimer > 0) {
    truck.boostTimer = Math.max(0, truck.boostTimer - clampedDt);
  }
  if (truck.boostCooldown > 0) {
    truck.boostCooldown = Math.max(0, truck.boostCooldown - clampedDt);
  }
  if (truck.invulnTimer > 0) {
    truck.invulnTimer = Math.max(0, truck.invulnTimer - clampedDt);
  }
  if (truck.ticketCooldown > 0) {
    truck.ticketCooldown = Math.max(0, truck.ticketCooldown - clampedDt);
  }
  if (truck.greenWaveTimer > 0) {
    truck.greenWaveTimer = Math.max(0, truck.greenWaveTimer - clampedDt);
  }
  if (truck.hornCooldown > 0) {
    truck.hornCooldown = Math.max(0, truck.hornCooldown - clampedDt);
  }
  if (truck.wallCrashCooldown && truck.wallCrashCooldown > 0) {
    truck.wallCrashCooldown = Math.max(0, truck.wallCrashCooldown - clampedDt);
  }

  // Parabolic Canal Jump Ramp flight physics!
  if (truck.y > 0 || truck.vy > 0) {
    truck.vy -= 17.2 * clampedDt;
    truck.y += truck.vy * clampedDt;
    if (truck.y <= 0) {
      truck.y = 0;
      truck.vy = 0;
      truck.squashY = 0.75;
      truck.squashVel = 4.4;
      truck.pitchAngle = 0.06;
    }
  }

  // Trigger manual boost if requested and off cooldown
  if (input.wantsBoost && truck.boostCooldown <= 0) {
    truck.boostTimer = 1.15;
    truck.boostCooldown = BOOST_COOLDOWN_MAX_SEC;
    truck.squashY = 0.78;
    truck.squashVel = 4.2;
    truck.pitchAngle = -0.075;
    activatedManualBoost = true;
  }

  // Spring-damper squash-and-stretch recovery
  const springForce = (1.0 - truck.squashY) * 38.0 - truck.squashVel * 7.5;
  truck.squashVel += springForce * clampedDt;
  truck.squashY = Math.max(
    0.68,
    Math.min(1.32, truck.squashY + truck.squashVel * clampedDt),
  );

  const throttleIn = Math.max(-1, Math.min(1, input.throttle));
  const steerIn = Math.max(-1, Math.min(1, input.steer));
  const isBraking = throttleIn < -0.05;
  truck.isBraking = isBraking;

  // Corner Drift-Charge: carving a sharp turn at speed recharges Turbo faster!
  const canDrift =
    !isBraking &&
    Math.abs(steerIn) > 0.45 &&
    truck.speed > 4.6 &&
    truck.y <= 0.05;
  if (canDrift && (input.wantsDrift || truck.speed > 6.2)) {
    truck.isDrifting = true;
    truck.driftChargeAccum += clampedDt;
    truck.boostCooldown = Math.max(0, truck.boostCooldown - clampedDt * 1.35);
  } else {
    truck.isDrifting = false;
    truck.driftChargeAccum = Math.max(0, truck.driftChargeAccum - clampedDt * 1.5);
  }

  // 1. Vehicle-Relative Forward Steering + Intersection Corner-Entry Assist:
  //    steer < 0 = Turn Left (+yaw), steer > 0 = Turn Right (-yaw).
  //    Reverse is strictly prohibited — S / ArrowDown only applies wheel brakes!
  const halfPi = Math.PI * 0.5;
  if (Math.abs(steerIn) > 0.01 && !isBraking) {
    const turnDir = -steerIn;
    const driftTurnBonus = truck.isDrifting ? 1.14 : 1.0;
    const turnSpeedRad = 3.9 * spec.turnSpeedMult * driftTurnBonus;
    let nextYaw = wrapAngleRad(truck.yaw + turnDir * turnSpeedRad * clampedDt);

    const cardinalYaw = Math.round(truck.yaw / halfPi) * halfPi;
    const cardFwdX = Math.sin(cardinalYaw);
    const cardFwdZ = Math.cos(cardinalYaw);
    const turnSign = turnDir >= 0 ? 1 : -1;
    const sideYaw = cardinalYaw + turnSign * halfPi;
    const sideColStep = Math.round(Math.sin(sideYaw));
    const sideRowStep = Math.round(Math.cos(sideYaw));
    const aheadColStep = Math.round(cardFwdX);
    const aheadRowStep = Math.round(cardFwdZ);

    const gcNow = worldToGrid(truck.x, truck.z, city.totalGridSize);
    const gcAhead = worldToGrid(
      truck.x + cardFwdX * (TILE_SIZE * 0.42),
      truck.z + cardFwdZ * (TILE_SIZE * 0.42),
      city.totalGridSize,
    );

    const sideOpen =
      isDrivableTile(
        city.tiles[gcNow.row + sideRowStep]?.[gcNow.col + sideColStep],
      ) ||
      isDrivableTile(
        city.tiles[gcAhead.row + sideRowStep]?.[gcAhead.col + sideColStep],
      );
    const aheadOpen = isDrivableTile(
      city.tiles[gcNow.row + aheadRowStep]?.[gcNow.col + aheadColStep],
    );

    if (!sideOpen && aheadOpen) {
      const maxLean = 0.42;
      const rel = wrapAngleRad(nextYaw - cardinalYaw);
      const clampedRel = Math.max(-maxLean, Math.min(maxLean, rel));
      nextYaw = wrapAngleRad(cardinalYaw + clampedRel);
    }

    truck.yaw = nextYaw;
  } else if (!isBraking && (throttleIn > 0.05 || truck.boostTimer > 0)) {
    const nearestCardinal = Math.round(truck.yaw / halfPi) * halfPi;
    const cardDiff = wrapAngleRad(nearestCardinal - truck.yaw);
    if (Math.abs(cardDiff) < 0.72) {
      truck.yaw = wrapAngleRad(
        truck.yaw + cardDiff * (1 - Math.exp(-8.5 * clampedDt)),
      );
    }
  }

  // 2. Forward-Only Throttle & Crisp Curbside Braking (Reverse Prohibited!)
  const fwdX = Math.sin(truck.yaw);
  const fwdZ = Math.cos(truck.yaw);
  const topFwdSpeed =
    (truck.boostTimer > 0 ? TRUCK_BOOST_SPEED : TRUCK_MAX_SPEED) *
    spec.maxSpeedMult;

  let effThrottle = Math.max(0, throttleIn);
  if (!isBraking && effThrottle < 0.05 && Math.abs(steerIn) > 0.05) {
    effThrottle = 0.68;
  }

  const wetGripMult = city.config.hasSunshower ? 0.86 : 1.0;

  if (isBraking) {
    truck.boostTimer = 0;
    const brakeDecay = Math.exp(-16.0 * wetGripMult * clampedDt);
    truck.vx *= brakeDecay;
    truck.vz *= brakeDecay;
    if (Math.hypot(truck.vx, truck.vz) < 0.12) {
      truck.vx = 0;
      truck.vz = 0;
    }
  } else if (truck.boostTimer > 0) {
    const targetVx = fwdX * topFwdSpeed;
    const targetVz = fwdZ * topFwdSpeed;
    const accelRate = 1 - Math.exp(-12.5 * spec.accelMult * clampedDt);
    truck.vx += (targetVx - truck.vx) * accelRate;
    truck.vz += (targetVz - truck.vz) * accelRate;
  } else if (effThrottle > 0.01) {
    const targetSpd = effThrottle * topFwdSpeed;
    const targetVx = fwdX * targetSpd;
    const targetVz = fwdZ * targetSpd;
    const accelRate = 1 - Math.exp(-13.0 * spec.accelMult * wetGripMult * clampedDt);
    truck.vx += (targetVx - truck.vx) * accelRate;
    truck.vz += (targetVz - truck.vz) * accelRate;
  } else {
    const drag = Math.exp(-9.5 * clampedDt);
    truck.vx *= drag;
    truck.vz *= drag;
    if (Math.hypot(truck.vx, truck.vz) < 0.06) {
      truck.vx = 0;
      truck.vz = 0;
    }
  }

  if (truck.invulnTimer <= 0 && (truck.wallCrashCooldown ?? 0) <= 0) {
    const fwdProj = truck.vx * fwdX + truck.vz * fwdZ;
    if (fwdProj < 0) {
      truck.vx -= fwdX * fwdProj;
      truck.vz -= fwdZ * fwdProj;
    }
  }

  // 3. Axis-Separated Movement + Intersection Corner Slide + Solid Wall/Gate/Prop Crash Rebound
  const prevX = truck.x;
  const prevZ = truck.z;
  const rightLaneX = -Math.cos(truck.yaw) * RIGHT_LANE_OFFSET;
  const rightLaneZ = Math.sin(truck.yaw) * RIGHT_LANE_OFFSET;

  const handleCurbBump = (heavy: boolean = false) => {
    hitCurb = true;
    if (truck.shockAbsorberAvailable) {
      truck.shockAbsorberAvailable = false;
      absorbedCurbWithShock = true;
    } else {
      truck.fragileIntact = false;
    }
    truck.squashY = heavy ? 1.2 : 1.12;
    truck.squashVel = heavy ? -3.2 : -2.3;
    truck.pitchAngle = heavy ? 0.085 : 0.065;
  };

  const emitWallOrGateCrash = (
    contactX: number,
    contactZ: number,
    nx: number,
    nz: number,
    impactSpeed: number,
    blockingGate: TrafficHazard | null,
  ) => {
    if ((truck.wallCrashCooldown ?? 0) > 0) return;
    truck.wallCrashCooldown = 0.45;
    truck.boostTimer = 0;
    const isHeavy = impactSpeed > 5.0 || Boolean(blockingGate && impactSpeed > 3.2);
    handleCurbBump(isHeavy);
    if (blockingGate) {
      blockingGate.bumpTimer = 0.4;
      crashEvents.push({
        x: contactX,
        y: 0.56,
        z: contactZ,
        nx,
        nz,
        kind: 'gate',
        severity: isHeavy ? 'crash' : 'bump',
        label: 'Clang! Drawbridge Gate!',
        involvesPlayer: true,
        hazardId: blockingGate.id,
      });
    } else {
      crashEvents.push({
        x: contactX,
        y: 0.46,
        z: contactZ,
        nx,
        nz,
        kind: 'building',
        severity: isHeavy ? 'crash' : 'bump',
        label: isHeavy ? 'Wall Crash!' : 'Curb Bonk!',
        involvesPlayer: true,
      });
    }
  };

  const nextX = truck.x + truck.vx * clampedDt;
  if (isPositionDrivable(city, nextX, truck.z, TRUCK_RADIUS, truck.y)) {
    truck.x = nextX;
  } else {
    const gc = worldToGrid(truck.x, truck.z, city.totalGridSize);
    const stepCol = nextX < truck.x ? -1 : 1;
    let turnRow = gc.row;
    if (!isDrivableTile(city.tiles[gc.row]?.[gc.col + stepCol])) {
      if (isDrivableTile(city.tiles[gc.row + 1]?.[gc.col + stepCol])) {
        turnRow = gc.row + 1;
      } else if (isDrivableTile(city.tiles[gc.row - 1]?.[gc.col + stepCol])) {
        turnRow = gc.row - 1;
      }
    }
    const roadCenter = gridToWorld(
      { col: gc.col, row: turnRow },
      city.totalGridSize,
    );
    const targetLaneZ = roadCenter.z + rightLaneZ;
    const nudgeZ =
      truck.z +
      Math.sign(targetLaneZ - truck.z) *
        Math.min(Math.abs(targetLaneZ - truck.z), 7.8 * clampedDt);
    if (isPositionDrivable(city, nextX, nudgeZ, TRUCK_RADIUS, truck.y)) {
      truck.x = nextX;
      truck.z = nudgeZ;
    } else {
      const axisSpd = Math.abs(truck.vx);
      const gate = findBlockingBridgeGate(city, nextX, truck.z, TRUCK_RADIUS, truck.y);
      if (axisSpd > 2.1 || (gate && axisSpd > 1.0)) {
        const dirSign = Math.sign(truck.vx) || 1;
        emitWallOrGateCrash(
          truck.x + dirSign * 0.58,
          truck.z,
          -dirSign,
          0,
          Math.max(axisSpd, prevSpeed * 0.8),
          gate,
        );
        truck.vx = -dirSign * Math.max(2.1, Math.min(4.6, axisSpd * 0.48));
      } else {
        truck.vx = 0;
      }
    }
  }

  const nextZ = truck.z + truck.vz * clampedDt;
  if (isPositionDrivable(city, truck.x, nextZ, TRUCK_RADIUS, truck.y)) {
    truck.z = nextZ;
  } else {
    const gc = worldToGrid(truck.x, truck.z, city.totalGridSize);
    const stepRow = nextZ < truck.z ? -1 : 1;
    let turnCol = gc.col;
    if (!isDrivableTile(city.tiles[gc.row + stepRow]?.[gc.col])) {
      if (isDrivableTile(city.tiles[gc.row + stepRow]?.[gc.col + 1])) {
        turnCol = gc.col + 1;
      } else if (isDrivableTile(city.tiles[gc.row + stepRow]?.[gc.col - 1])) {
        turnCol = gc.col - 1;
      }
    }
    const roadCenter = gridToWorld(
      { col: turnCol, row: gc.row },
      city.totalGridSize,
    );
    const targetLaneX = roadCenter.x + rightLaneX;
    const nudgeX =
      truck.x +
      Math.sign(targetLaneX - truck.x) *
        Math.min(Math.abs(targetLaneX - truck.x), 7.8 * clampedDt);
    if (isPositionDrivable(city, nudgeX, nextZ, TRUCK_RADIUS, truck.y)) {
      truck.x = nudgeX;
      truck.z = nextZ;
    } else {
      const axisSpd = Math.abs(truck.vz);
      const gate = findBlockingBridgeGate(city, truck.x, nextZ, TRUCK_RADIUS, truck.y);
      if (axisSpd > 2.1 || (gate && axisSpd > 1.0)) {
        const dirSign = Math.sign(truck.vz) || 1;
        emitWallOrGateCrash(
          truck.x,
          truck.z + dirSign * 0.58,
          0,
          -dirSign,
          Math.max(axisSpd, prevSpeed * 0.8),
          gate,
        );
        truck.vz = -dirSign * Math.max(2.1, Math.min(4.6, axisSpd * 0.48));
      } else {
        truck.vz = 0;
      }
    }
  }

  // Solid 3D Collision against Roadside Street Props, Kiosk Booths & Garage Structures
  if (truck.y <= 0.35) {
    const resolveStaticCircle = (ox: number, oz: number, obsRadius: number, propLabel: string) => {
      const dx = truck.x - ox;
      const dz = truck.z - oz;
      if (Math.abs(dx) > 1.8 || Math.abs(dz) > 1.8) return;
      const minD = obsRadius + 0.38;
      const d = Math.hypot(dx, dz);
      if (d < minD) {
        const nx = d > 1e-4 ? dx / d : Math.sin(truck.yaw + Math.PI);
        const nz = d > 1e-4 ? dz / d : Math.cos(truck.yaw + Math.PI);
        const candX = ox + nx * (minD + 0.015);
        const candZ = oz + nz * (minD + 0.015);
        if (isPositionDrivable(city, candX, candZ, TRUCK_RADIUS * 0.9, truck.y)) {
          truck.x = candX;
          truck.z = candZ;
        }
        const vn = truck.vx * nx + truck.vz * nz;
        if (vn < 0) {
          const bounce = Math.max(2.0, Math.min(4.4, -vn * 0.52 + 1.4));
          truck.vx += nx * (-vn + bounce);
          truck.vz += nz * (-vn + bounce);
        }
        const imp = Math.max(prevSpeed, Math.hypot(truck.vx, truck.vz));
        if ((truck.wallCrashCooldown ?? 0) <= 0 && imp > 1.9) {
          truck.wallCrashCooldown = 0.45;
          truck.boostTimer = 0;
          handleCurbBump(imp > 5.0);
          crashEvents.push({
            x: ox + nx * obsRadius,
            y: 0.5,
            z: oz + nz * obsRadius,
            nx,
            nz,
            kind: 'prop',
            severity: imp > 5.0 ? 'crash' : 'bump',
            label: propLabel,
            involvesPlayer: true,
          });
        }
      }
    };

    for (const sp of city.streetProps) {
      if (sp.kind === 'hydrant') continue;
      resolveStaticCircle(sp.x, sp.z, getStreetPropObstacleRadius(sp), 'Prop Bonk!');
    }
    for (const k of city.coffeeKiosks) {
      resolveStaticCircle(k.kioskX, k.kioskZ, 0.5, 'Kiosk Bumper Tap!');
    }
    for (const g of city.mechanicGarages) {
      resolveStaticCircle(g.garageX, g.garageZ, 0.56, 'Garage Post Bump!');
    }
  }

  const gcAfter = worldToGrid(truck.x, truck.z, city.totalGridSize);
  const centerAfter = gridToWorld(gcAfter, city.totalGridSize);
  const roadDeg = countDrivableNeighbors(city, gcAfter.col, gcAfter.row);

  if (
    Math.abs(steerIn) < 0.02 &&
    !isBraking &&
    roadDeg <= 2 &&
    Math.hypot(truck.vx, truck.vz) > 1.2
  ) {
    const curLatRight =
      (truck.x - centerAfter.x) * -Math.cos(truck.yaw) +
      (truck.z - centerAfter.z) * Math.sin(truck.yaw);
    if (curLatRight >= -0.14) {
      if (Math.abs(fwdX) > 0.92) {
        const targetZ = centerAfter.z + Math.sign(fwdX) * RIGHT_LANE_OFFSET;
        const dzErr = targetZ - truck.z;
        const pullZ =
          truck.z + Math.sign(dzErr) * Math.min(Math.abs(dzErr), 2.1 * clampedDt);
        if (isPositionDrivable(city, truck.x, pullZ, TRUCK_RADIUS, truck.y)) {
          truck.z = pullZ;
        }
      } else if (Math.abs(fwdZ) > 0.92) {
        const targetX = centerAfter.x - Math.sign(fwdZ) * RIGHT_LANE_OFFSET;
        const dxErr = targetX - truck.x;
        const pullX =
          truck.x + Math.sign(dxErr) * Math.min(Math.abs(dxErr), 2.1 * clampedDt);
        if (isPositionDrivable(city, pullX, truck.z, TRUCK_RADIUS, truck.y)) {
          truck.x = pullX;
        }
      }
    }
  }

  const dxActual = truck.x - prevX;
  const dzActual = truck.z - prevZ;
  const stepDist = Math.hypot(dxActual, dzActual);
  const signedMove = dxActual * fwdX + dzActual * fwdZ;
  truck.distanceTraveled += Math.max(0, signedMove >= 0 ? stepDist : 0);
  truck.speed = stepDist / Math.max(clampedDt, 0.0001);

  // 4. Wrong-Way Lane Enforcement & Ticket Citation!
  const latRightNow =
    (truck.x - centerAfter.x) * -Math.cos(truck.yaw) +
    (truck.z - centerAfter.z) * Math.sin(truck.yaw);
  if (roadDeg <= 2 && truck.speed > 1.75 && latRightNow < -0.16 && truck.y <= 0.2) {
    truck.isWrongWay = true;
    if (truck.ticketCooldown <= 0) {
      truck.wrongWayTimer += clampedDt;
      if (truck.wrongWayTimer >= WRONG_WAY_LIMIT_SEC) {
        issuedTicket = 'wrong_way';
        truck.ticketsCount += 1;
        truck.fragileIntact = false;
        truck.ticketCooldown = 4.2;
        truck.wrongWayTimer = 0;
        truck.isWrongWay = false;
      }
    }
  } else {
    truck.isWrongWay = false;
    truck.wrongWayTimer = Math.max(0, truck.wrongWayTimer - clampedDt * 2.4);
  }

  // 5. Intersection Red-Light Enforcement & Ticket Citation (bypassed during Green-Wave or Air Jump!)
  if (city.trafficSignals.length > 0 && truck.greenWaveTimer <= 0 && truck.y <= 0.25) {
    if (truck.lastSignalCellKey) {
      const prevSig = city.trafficSignals.find(
        (s) => s.id === truck.lastSignalCellKey,
      );
      if (!prevSig || Math.hypot(truck.x - prevSig.x, truck.z - prevSig.z) > 1.55) {
        truck.lastSignalCellKey = '';
      }
    }

    for (const sig of city.trafficSignals) {
      const dSig = Math.hypot(truck.x - sig.x, truck.z - sig.z);
      if (dSig < 1.05 && sig.id !== truck.lastSignalCellKey) {
        truck.lastSignalCellKey = sig.id;
        if (truck.speed > 2.3 && truck.ticketCooldown <= 0 && !issuedTicket) {
          const movingEW = Math.abs(fwdX) >= Math.abs(fwdZ);
          const runningRed = movingEW
            ? sig.state === SignalAxisState.NSGreen ||
              sig.state === SignalAxisState.NSYellow
            : sig.state === SignalAxisState.EWGreen ||
              sig.state === SignalAxisState.EWYellow;
          if (runningRed) {
            issuedTicket = 'red_light';
            truck.ticketsCount += 1;
            truck.fragileIntact = false;
            truck.ticketCooldown = 4.0;
          }
        }
        break;
      }
    }
  }

  // 6. Front-Wheel Steering Angle + Chassis Suspension Roll & Pitch!
  const appliedYawDelta = wrapAngleRad(truck.yaw - prevYaw);
  const yawRate = appliedYawDelta / Math.max(clampedDt, 0.001);

  const targetSteer = Math.max(-0.46, Math.min(0.46, -steerIn * 0.44));
  truck.steerAngle +=
    (targetSteer - truck.steerAngle) * (1 - Math.exp(-16.0 * clampedDt));

  const speedNorm = Math.min(1.2, truck.speed / TRUCK_MAX_SPEED);
  const targetRoll = Math.max(
    -0.14,
    Math.min(0.14, yawRate * speedNorm * (truck.isDrifting ? 0.032 : 0.024)),
  );
  truck.rollAngle +=
    (targetRoll - truck.rollAngle) * (1 - Math.exp(-12.0 * clampedDt));

  const longAccel = (truck.speed - prevSpeed) / Math.max(clampedDt, 0.001);
  const airPitch = truck.y > 0.05 ? Math.max(-0.22, Math.min(0.18, -truck.vy * 0.03)) : null;
  const targetPitch =
    airPitch !== null
      ? airPitch
      : isBraking && truck.speed > 0.5
        ? 0.075
        : Math.max(-0.085, Math.min(0.085, -longAccel * 0.0042));
  truck.pitchAngle +=
    (targetPitch - truck.pitchAngle) * (1 - Math.exp(-11.0 * clampedDt));

  // 7. Check Boost Pads
  if (truck.boostTimer <= 0.25 && !isBraking && truck.y <= 0.15) {
    for (const pad of city.boostPads) {
      const pw = gridToWorld(pad.coord, city.totalGridSize);
      if (Math.hypot(truck.x - pw.x, truck.z - pw.z) < TILE_SIZE * 0.48) {
        truck.boostTimer = 1.35;
        truck.squashY = 0.76;
        truck.squashVel = 4.6;
        truck.pitchAngle = -0.08;
        triggeredBoostPad = true;
        break;
      }
    }
  }

  // 8. Check Canal Jump Ramps!
  for (const ramp of city.jumpRamps) {
    if (ramp.cooldown > 0) {
      ramp.cooldown = Math.max(0, ramp.cooldown - clampedDt);
    } else if (
      truck.y <= 0.05 &&
      truck.speed > 3.0 &&
      Math.hypot(truck.x - ramp.x, truck.z - ramp.z) < 1.18
    ) {
      ramp.cooldown = 3.2;
      truck.vy = 6.9;
      truck.y = 0.12;
      truck.boostTimer = Math.max(truck.boostTimer, 0.85);
      truck.squashY = 1.18;
      truck.squashVel = 2.8;
      activatedJumpRamp = true;
    }
  }

  // 9. Check Green-Wave Signal Transponder Pickups!
  for (const gw of city.greenWavePickups) {
    if (gw.cooldown > 0) {
      gw.cooldown = Math.max(0, gw.cooldown - clampedDt);
    } else if (Math.hypot(truck.x - gw.x, truck.z - gw.z) < 1.25) {
      gw.cooldown = 20.0;
      truck.greenWaveTimer = 7.5;
      const movingEW = Math.abs(fwdX) >= Math.abs(fwdZ);
      for (const sig of city.trafficSignals) {
        sig.state = movingEW ? SignalAxisState.EWGreen : SignalAxisState.NSGreen;
        sig.timer = 7.5;
      }
      pickedGreenWave = true;
    }
  }

  // 10. Check Roadside Fire Hydrant Geyser Splash (cools Turbo engine!)
  for (const sp of city.streetProps) {
    if (sp.kind !== 'hydrant') continue;
    if (sp.geyserTimer && sp.geyserTimer > 0) {
      sp.geyserTimer = Math.max(0, sp.geyserTimer - clampedDt);
    } else if (
      truck.speed > 4.2 &&
      Math.hypot(truck.x - sp.x, truck.z - sp.z) < 1.38
    ) {
      sp.geyserTimer = 2.8;
      truck.boostCooldown = Math.max(0, truck.boostCooldown - 1.4);
      splashedHydrantPos = { x: sp.x, z: sp.z };
    }
  }

  return {
    hitCurb,
    absorbedCurbWithShock,
    triggeredBoostPad,
    activatedManualBoost,
    activatedJumpRamp,
    pickedGreenWave,
    splashedHydrantPos,
    issuedTicket,
    crashEvents,
  };
}
