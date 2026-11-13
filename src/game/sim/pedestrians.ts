/**
 * src/game/sim/pedestrians.ts
 *
 * Extracted verbatim from src/game/rules.ts — no logic changes.
 * Public API is re-exported by src/game/rules.ts.
 */

import {
  GeneratedCity,
  SidewalkPedestrian,
  TruckState,
} from '../types';

import {
  PEDESTRIAN_RADIUS,
} from '../../config/balance';

import {
  getStreetPropObstacleRadius,
  getTreeObstacleRadius,
  isPedestrianPointClear,
  isWalkablePedestrianTile,
  worldToGrid,
} from '../proceduralCity';

/**
 * Obstacle-aware pedestrian locomotion physics
 */
export function stepPedestriansPhysics(
  pedestrians: SidewalkPedestrian[],
  city: GeneratedCity,
  truck: TruckState,
  dt: number,
): void {
  const clampedDt = Math.min(dt, 0.05);
  if (clampedDt <= 0 || pedestrians.length === 0) return;

  const N = city.totalGridSize;

  for (let i = 0; i < pedestrians.length; i++) {
    const p = pedestrians[i];
    if (p.waypoints.length < 2) continue;

    const distToTruck = Math.hypot(truck.x - p.x, truck.z - p.z);
    if (distToTruck < 3.3 && truck.speed > 1.8 && p.waveTimer <= 0) {
      p.waveTimer = 1.05;
    }

    if (p.waveTimer > 0) {
      p.waveTimer = Math.max(0, p.waveTimer - clampedDt);
      p.vx *= Math.exp(-10 * clampedDt);
      p.vz *= Math.exp(-10 * clampedDt);
      const lookTruckYaw = Math.atan2(truck.x - p.x, truck.z - p.z);
      let dYaw = lookTruckYaw - p.yaw;
      while (dYaw > Math.PI) dYaw -= Math.PI * 2;
      while (dYaw < -Math.PI) dYaw += Math.PI * 2;
      p.yaw += dYaw * (1 - Math.exp(-10 * clampedDt));
      continue;
    }

    if (p.pauseTimer > 0) {
      p.pauseTimer = Math.max(0, p.pauseTimer - clampedDt);
      p.vx *= Math.exp(-12 * clampedDt);
      p.vz *= Math.exp(-12 * clampedDt);
      continue;
    }

    const target = p.waypoints[p.waypointIndex];
    const toX = target.x - p.x;
    const toZ = target.z - p.z;
    const distTarget = Math.hypot(toX, toZ);

    if (distTarget < 0.16) {
      p.waypointIndex = (p.waypointIndex + 1) % p.waypoints.length;
      p.pauseTimer = 0.45 + ((i * 37) % 5) * 0.12;
      p.vx = 0;
      p.vz = 0;
      continue;
    }

    let desVx = (toX / distTarget) * p.walkSpeed;
    let desVz = (toZ / distTarget) * p.walkSpeed;

    let repX = 0;
    let repZ = 0;

    for (const t of city.trees) {
      const dx = p.x - t.x;
      const dz = p.z - t.z;
      if (Math.abs(dx) > 1.5 || Math.abs(dz) > 1.5) continue;
      const d = Math.hypot(dx, dz);
      const safeR = getTreeObstacleRadius(t) + PEDESTRIAN_RADIUS + 0.28;
      if (d > 0.001 && d < safeR) {
        const push = ((safeR - d) / safeR) * 2.8;
        repX += (dx / d) * push;
        repZ += (dz / d) * push;
      }
    }

    for (const sp of city.streetProps) {
      const dx = p.x - sp.x;
      const dz = p.z - sp.z;
      if (Math.abs(dx) > 1.5 || Math.abs(dz) > 1.5) continue;
      const d = Math.hypot(dx, dz);
      const safeR = getStreetPropObstacleRadius(sp) + PEDESTRIAN_RADIUS + 0.24;
      if (d > 0.001 && d < safeR) {
        const push = ((safeR - d) / safeR) * 2.6;
        repX += (dx / d) * push;
        repZ += (dz / d) * push;
      }
    }

    for (let j = 0; j < pedestrians.length; j++) {
      if (i === j) continue;
      const other = pedestrians[j];
      const dx = p.x - other.x;
      const dz = p.z - other.z;
      if (Math.abs(dx) > 0.95 || Math.abs(dz) > 0.95) continue;
      const d = Math.hypot(dx, dz);
      const personalSpace = PEDESTRIAN_RADIUS * 2 + 0.28;
      if (d > 0.001 && d < personalSpace) {
        const push = ((personalSpace - d) / personalSpace) * 2.2;
        repX += (dx / d - (dz / d) * 0.45) * push;
        repZ += (dz / d + (dx / d) * 0.45) * push;
      }
    }

    desVx += repX;
    desVz += repZ;
    const desMag = Math.hypot(desVx, desVz);
    if (desMag > p.walkSpeed * 1.15) {
      desVx = (desVx / desMag) * (p.walkSpeed * 1.15);
      desVz = (desVz / desMag) * (p.walkSpeed * 1.15);
    }

    const blend = 1 - Math.exp(-10.0 * clampedDt);
    p.vx += (desVx - p.vx) * blend;
    p.vz += (desVz - p.vz) * blend;

    const prevX = p.x;
    const prevZ = p.z;
    let candX = prevX + p.vx * clampedDt;
    let candZ = prevZ + p.vz * clampedDt;

    for (const t of city.trees) {
      const dx = candX - t.x;
      const dz = candZ - t.z;
      if (Math.abs(dx) > 1.3 || Math.abs(dz) > 1.3) continue;
      const minD = getTreeObstacleRadius(t) + PEDESTRIAN_RADIUS + 0.02;
      const d = Math.hypot(dx, dz);
      if (d < minD) {
        const nx = d > 0.0001 ? dx / d : 1;
        const nz = d > 0.0001 ? dz / d : 0;
        candX = t.x + nx * minD;
        candZ = t.z + nz * minD;
      }
    }

    for (const sp of city.streetProps) {
      const dx = candX - sp.x;
      const dz = candZ - sp.z;
      if (Math.abs(dx) > 1.3 || Math.abs(dz) > 1.3) continue;
      const minD = getStreetPropObstacleRadius(sp) + PEDESTRIAN_RADIUS + 0.02;
      const d = Math.hypot(dx, dz);
      if (d < minD) {
        const nx = d > 0.0001 ? dx / d : 1;
        const nz = d > 0.0001 ? dz / d : 0;
        candX = sp.x + nx * minD;
        candZ = sp.z + nz * minD;
      }
    }

    const gcCenter = worldToGrid(candX, candZ, N);
    const tileOk = isWalkablePedestrianTile(city.tiles[gcCenter.row]?.[gcCenter.col]);
    const fullClear =
      tileOk &&
      isPedestrianPointClear(
        candX,
        candZ,
        city.tiles,
        N,
        city.trees,
        city.streetProps,
        city.stops,
        city.brickWalls,
        0.0,
        city.coffeeKiosks,
        city.mechanicGarages,
      );

    if (fullClear) {
      p.x = candX;
      p.z = candZ;
    } else {
      p.x = prevX;
      p.z = prevZ;
      p.vx = 0;
      p.vz = 0;
      p.waypointIndex = (p.waypointIndex + 1) % p.waypoints.length;
      p.pauseTimer = 0.35;
    }

    const moved = Math.hypot(p.x - prevX, p.z - prevZ);
    p.strideDistance += moved;

    if (moved > 0.0015) {
      const targetYaw = Math.atan2(p.x - prevX, p.z - prevZ);
      let dYaw = targetYaw - p.yaw;
      while (dYaw > Math.PI) dYaw -= Math.PI * 2;
      while (dYaw < -Math.PI) dYaw += Math.PI * 2;
      p.yaw += dYaw * (1 - Math.exp(-12.0 * clampedDt));
    }
  }
}
