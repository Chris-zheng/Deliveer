/**
 * src/game/sim/collision.ts
 *
 * Extracted verbatim from src/game/rules.ts — no logic changes.
 * Public API is re-exported by src/game/rules.ts.
 */

import {
  GeneratedCity,
  HazardKind,
  HazardPhase,
  TrafficHazard,
} from '../types';

import {
  TRUCK_RADIUS,
} from '../../config/balance';

import {
  isDrivableTile,
  worldToGrid,
} from '../proceduralCity';

export interface VehicleCapsuleSpec {
  halfSeg: number;
  rLat: number;
}

// Calibrated to 3D mesh footprints while keeping opposite right-hand lanes (±0.44 = 0.88 spacing) cleanly clear!
export const TRUCK_CAPSULE: VehicleCapsuleSpec = { halfSeg: 0.36, rLat: 0.37 };
export const RIVAL_CAPSULE: VehicleCapsuleSpec = { halfSeg: 0.38, rLat: 0.37 };

export function getHazardCapsuleSpec(h: TrafficHazard): VehicleCapsuleSpec {
  if (h.kind === HazardKind.Cruiser) {
    return h.isBus
      ? { halfSeg: 0.46, rLat: 0.37 }
      : { halfSeg: 0.34, rLat: 0.35 };
  }
  if (h.kind === HazardKind.ScooterDash) {
    return { halfSeg: 0.22, rLat: 0.25 };
  }
  return { halfSeg: 0.65, rLat: 0.28 };
}

export interface CapsuleContactResult {
  dist: number;
  penetration: number;
  nx: number;
  nz: number;
  cx: number;
  cz: number;
}

/**
 * Exact 2D oriented capsule-vs-capsule contact solver on the XZ road plane.
 * Normal (nx, nz) points from B toward A; penetration > 0 indicates solid 3D overlap.
 */
export function closestCapsuleContact(
  ax: number,
  az: number,
  yawA: number,
  specA: VehicleCapsuleSpec,
  bx: number,
  bz: number,
  yawB: number,
  specB: VehicleCapsuleSpec,
): CapsuleContactResult {
  const fxA = Math.sin(yawA);
  const fzA = Math.cos(yawA);
  const fxB = Math.sin(yawB);
  const fzB = Math.cos(yawB);

  const dx = ax - bx;
  const dz = az - bz;
  const b = fxA * fxB + fzA * fzB;
  const c = fxA * dx + fzA * dz;
  const f = fxB * dx + fzB * dz;
  const denom = 1 - b * b;

  let s = 0;
  let t = 0;
  if (denom > 1e-5) {
    s = Math.max(-specA.halfSeg, Math.min(specA.halfSeg, (b * f - c) / denom));
    t = b * s + f;
    if (t < -specB.halfSeg) {
      t = -specB.halfSeg;
      s = Math.max(-specA.halfSeg, Math.min(specA.halfSeg, b * t - c));
    } else if (t > specB.halfSeg) {
      t = specB.halfSeg;
      s = Math.max(-specA.halfSeg, Math.min(specA.halfSeg, b * t - c));
    }
  } else {
    const sB0 = -c - b * specB.halfSeg;
    const sB1 = -c + b * specB.halfSeg;
    const lo = Math.max(-specA.halfSeg, Math.min(sB0, sB1));
    const hi = Math.min(specA.halfSeg, Math.max(sB0, sB1));
    s = lo <= hi ? 0.5 * (lo + hi) : lo > specA.halfSeg ? specA.halfSeg : -specA.halfSeg;
    t = Math.max(-specB.halfSeg, Math.min(specB.halfSeg, b * s + f));
    s = Math.max(-specA.halfSeg, Math.min(specA.halfSeg, b * t - c));
  }

  const px = ax + fxA * s;
  const pz = az + fzA * s;
  const qx = bx + fxB * t;
  const qz = bz + fzB * t;
  const vx = px - qx;
  const vz = pz - qz;
  const dist = Math.hypot(vx, vz);

  let nx = 0;
  let nz = 1;
  const minSep = specA.rLat + specB.rLat;
  let penetration = minSep - dist;

  if (dist > 1e-4) {
    nx = vx / dist;
    nz = vz / dist;
  } else {
    const cd = Math.hypot(dx, dz);
    if (cd > 1e-4) {
      nx = dx / cd;
      nz = dz / cd;
    } else {
      nx = -fzB;
      nz = fxB;
    }
    // Segments intersect (dist ~ 0): compute exact separation needed along (nx, nz) so segments clear by minSep
    const projSpan =
      Math.abs(fxA * nx + fzA * nz) * specA.halfSeg +
      Math.abs(fxB * nx + fzB * nz) * specB.halfSeg +
      minSep;
    penetration = Math.max(penetration, projSpan - (dx * nx + dz * nz));
  }

  return {
    dist,
    penetration,
    nx,
    nz,
    cx: (px + qx) * 0.5,
    cz: (pz + qz) * 0.5,
  };
}

export function findBlockingBridgeGate(
  city: GeneratedCity,
  x: number,
  z: number,
  radius: number,
  truckY: number,
): TrafficHazard | null {
  if (truckY > 0.35) return null;
  for (const h of city.hazards) {
    if (h.kind === HazardKind.BridgeGate && h.phase === HazardPhase.Active) {
      if (Math.abs(x - h.x) < 0.85 + radius && Math.abs(z - h.z) < 0.85 + radius) {
        return h;
      }
    }
  }
  return null;
}

export function isPositionDrivable(
  city: GeneratedCity,
  x: number,
  z: number,
  radius: number = TRUCK_RADIUS,
  truckY: number = 0,
): boolean {
  const offsets = [
    [-radius, -radius],
    [radius, -radius],
    [-radius, radius],
    [radius, radius],
  ];
  for (const [ox, oz] of offsets) {
    const gc = worldToGrid(x + ox, z + oz, city.totalGridSize);
    const tile = city.tiles[gc.row]?.[gc.col];
    if (tile === undefined || !isDrivableTile(tile)) {
      return false;
    }
    // Airborne vans soaring off a Canal Jump Ramp clear closed BridgeGate barriers!
    if (truckY <= 0.35) {
      for (const h of city.hazards) {
        if (h.kind === HazardKind.BridgeGate && h.phase === HazardPhase.Active) {
          const dx = Math.abs(x + ox - h.x);
          const dz = Math.abs(z + oz - h.z);
          if (dx < 0.85 && dz < 0.85) {
            return false;
          }
        }
      }
    }
  }
  return true;
}
