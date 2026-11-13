/**
 * src/game/sim/hazards.ts
 *
 * Extracted verbatim from src/game/rules.ts — no logic changes.
 * Public API is re-exported by src/game/rules.ts.
 */

import {
  CrashEvent,
  GeneratedCity,
  HazardKind,
  HazardPhase,
  HonkEvent,
  SignalAxisState,
  TrafficHazard,
  TrafficSignal,
  TruckState,
} from '../types';
import { CROSSING_WARNING_SEC } from '../hazardWarning';


import {
  MAX_CONCURRENT_SCOOTER_ATTACKS,
  RIGHT_LANE_OFFSET,
  TRUCK_RADIUS,
} from '../../config/balance';

import {
  RIVAL_CAPSULE,
  TRUCK_CAPSULE,
  closestCapsuleContact,
  getHazardCapsuleSpec,
  isPositionDrivable,
} from './collision';

export interface HazardStepEvents {
  startedWindups: TrafficHazard[];
  playerHitBy: TrafficHazard | null;
  shieldAbsorbed: boolean;
  nearMissCount: number;
  crashEvents: CrashEvent[];
  honkEvents: HonkEvent[];
}

function clampHazardMove(
  city: GeneratedCity | undefined,
  curX: number,
  curZ: number,
  candX: number,
  candZ: number,
): { x: number; z: number; moved: boolean } {
  if (!city || isPositionDrivable(city, candX, candZ, 0.32, 0)) {
    return { x: candX, z: candZ, moved: true };
  }
  if (isPositionDrivable(city, candX, curZ, 0.32, 0)) {
    return { x: candX, z: curZ, moved: true };
  }
  if (isPositionDrivable(city, curX, candZ, 0.32, 0)) {
    return { x: curX, z: candZ, moved: true };
  }
  return { x: curX, z: curZ, moved: false };
}

export function stepHazardsAndCollisions(
  hazards: TrafficHazard[],
  truck: TruckState,
  dt: number,
  signals: TrafficSignal[] = [],
  city?: GeneratedCity,
): HazardStepEvents {
  const clampedDt = Math.min(dt, 0.05);
  const startedWindups: TrafficHazard[] = [];
  let playerHitBy: TrafficHazard | null = null;
  let shieldAbsorbed = false;
  let nearMissCount = 0;
  const crashEvents: CrashEvent[] = [];
  const honkEvents: HonkEvent[] = [];

  let activeScooterAttackers = hazards.filter(
    (h) =>
      h.kind === HazardKind.ScooterDash &&
      (h.phase === HazardPhase.Windup || h.phase === HazardPhase.Active),
  ).length;

  for (let i = 0; i < hazards.length; i++) {
    const h = hazards[i];
    if (h.nearMissCooldown && h.nearMissCooldown > 0) {
      h.nearMissCooldown = Math.max(0, h.nearMissCooldown - clampedDt);
    }
    if (h.calmedByHornTimer && h.calmedByHornTimer > 0) {
      h.calmedByHornTimer = Math.max(0, h.calmedByHornTimer - clampedDt);
    }
    if (h.bumpTimer && h.bumpTimer > 0) {
      h.bumpTimer = Math.max(0, h.bumpTimer - clampedDt);
    }
    if (h.crashCooldown && h.crashCooldown > 0) {
      h.crashCooldown = Math.max(0, h.crashCooldown - clampedDt);
    }
    if (h.honkCooldown && h.honkCooldown > 0) {
      h.honkCooldown = Math.max(0, h.honkCooldown - clampedDt);
    }
    if (h.honkVisualTimer && h.honkVisualTimer > 0) {
      h.honkVisualTimer = Math.max(0, h.honkVisualTimer - clampedDt);
    }
    if (h.bumpVx || h.bumpVz) {
      const bvx = h.bumpVx ?? 0;
      const bvz = h.bumpVz ?? 0;
      const stepped = clampHazardMove(
        city,
        h.x,
        h.z,
        h.x + bvx * clampedDt,
        h.z + bvz * clampedDt,
      );
      h.x = stepped.x;
      h.z = stepped.z;
      const decay = Math.exp(-9.5 * clampedDt);
      h.bumpVx = Math.abs(bvx * decay) < 0.04 ? 0 : bvx * decay;
      h.bumpVz = Math.abs(bvz * decay) < 0.04 ? 0 : bvz * decay;
    }

    if (h.kind === HazardKind.Cruiser) {
      const target = h.waypoints[h.waypointIndex];
      const dx = target.x - h.x;
      const dz = target.z - h.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.16) {
        h.waypointIndex = (h.waypointIndex + 1) % h.waypoints.length;
        const nextT = h.waypoints[h.waypointIndex];
        h.yaw = Math.atan2(nextT.x - h.x, nextT.z - h.z);
      } else {
        const dirX = dx / dist;
        const dirZ = dz / dist;
        h.yaw = Math.atan2(dirX, dirZ);

        let mustStop = false;
        for (const sig of signals) {
          const sx = sig.x - h.x;
          const sz = sig.z - h.z;
          const aheadProj = sx * dirX + sz * dirZ;
          const latProj = Math.abs(sx * -dirZ + sz * dirX);
          if (aheadProj > 1.05 && aheadProj < 2.35 && latProj < 0.85) {
            const movingEW = Math.abs(dirX) >= Math.abs(dirZ);
            const greenForMe = movingEW
              ? sig.state === SignalAxisState.EWGreen
              : sig.state === SignalAxisState.NSGreen;
            if (!greenForMe) {
              mustStop = true;
              break;
            }
          }
        }

        if (!mustStop) {
          for (let j = 0; j < hazards.length; j++) {
            if (i === j) continue;
            const other = hazards[j];
            const ox = other.x - h.x;
            const oz = other.z - h.z;
            const ahead = ox * dirX + oz * dirZ;
            const lat = Math.abs(ox * -dirZ + oz * dirX);

            if (other.kind === HazardKind.BridgeGate) {
              if (
                other.phase !== HazardPhase.Idle &&
                ahead > 0.55 &&
                ahead < 2.45 &&
                lat < 0.9
              ) {
                mustStop = true;
                break;
              }
              continue;
            }

            if (other.kind === HazardKind.Cruiser) {
              const cosDiff = Math.cos(other.yaw - h.yaw);
              // Same-lane queuing OR crossing-vehicle yield inside an intersection
              if (cosDiff > 0.55 && ahead > 0.45 && ahead < 2.25 && lat < 0.52) {
                mustStop = true;
                break;
              }
              if (
                Math.abs(cosDiff) <= 0.55 &&
                ahead > 0.35 &&
                ahead < 1.85 &&
                lat < 0.68 &&
                other.currentSpeed > 0.4
              ) {
                // Deterministic tie-breaker so two perpendicular cars don't deadlock forever
                if (i > j || other.currentSpeed > h.currentSpeed + 0.3) {
                  mustStop = true;
                  break;
                }
              }
            } else if (
              other.kind === HazardKind.ScooterDash &&
              other.phase === HazardPhase.Active &&
              ahead > 0.3 &&
              ahead < 2.0 &&
              lat < 0.65
            ) {
              mustStop = true;
              break;
            }
          }
        }

        // Politely yield behind a slow/stopped Player Van in the same lane so AI cars don't endlessly rear-end a parked player
        if (!mustStop && truck.y < 0.4 && truck.speed < 2.5) {
          const tx = truck.x - h.x;
          const tz = truck.z - h.z;
          const ahead = tx * dirX + tz * dirZ;
          const lat = Math.abs(tx * -dirZ + tz * dirX);
          if (ahead > 0.6 && ahead < 2.25 && lat < 0.55) {
            mustStop = true;
          }
        }

        if (!mustStop && city?.rivalCourier) {
          const rx = city.rivalCourier.x - h.x;
          const rz = city.rivalCourier.z - h.z;
          const ahead = rx * dirX + rz * dirZ;
          const lat = Math.abs(rx * -dirZ + rz * dirX);
          if (ahead > 0.5 && ahead < 2.05 && lat < 0.55) {
            mustStop = true;
          }
        }

        h.stoppedAtSignal = mustStop;
        h.stoppedDuration = mustStop ? (h.stoppedDuration ?? 0) + clampedDt : 0;

        // Ambient AI Car & Minibus Honking when queued at signals/intersections or buzzed closely by player!
        if (honkEvents.length < 2 && (h.honkCooldown ?? 0) <= 0) {
          const distToTruck = Math.hypot(truck.x - h.x, truck.z - h.z);
          const impatientQueue =
            mustStop &&
            (h.stoppedDuration ?? 0) >= 1.25 + (i % 3) * 0.45 &&
            distToTruck <= 32;
          const startledBySpeedingVan =
            distToTruck < 4.6 && truck.speed > 5.4 && truck.y < 0.4;
          if (impatientQueue || startledBySpeedingVan) {
            h.honkCooldown = 5.4 + (i % 4) * 1.5;
            h.honkVisualTimer = 0.72;
            honkEvents.push({
              hazardId: h.id,
              x: h.x,
              z: h.z,
              isBus: Boolean(h.isBus),
            });
          }
        }

        const targetSpd = mustStop || (h.bumpTimer ?? 0) > 0.18 ? 0 : h.speed;
        h.currentSpeed +=
          (targetSpd - h.currentSpeed) * (1 - Math.exp(-11.0 * clampedDt));
        if (h.currentSpeed > 0.02) {
          const step = Math.min(dist, h.currentSpeed * clampedDt);
          const candX = h.x + dirX * step;
          const candZ = h.z + dirZ * step;
          if (!city || isPositionDrivable(city, candX, candZ, 0.32, 0)) {
            h.x = candX;
            h.z = candZ;
          } else {
            h.currentSpeed = 0;
          }
        }
      }
    } else if (h.kind === HazardKind.ScooterDash) {
      h.phaseTimer -= clampedDt;
      if (h.phase === HazardPhase.Idle) {
        const distToPlayer = Math.hypot(truck.x - h.x, truck.z - h.z);
        if (
          (h.calmedByHornTimer ?? 0) <= 0 &&
          h.phaseTimer <= 0 &&
          distToPlayer < 12.5 &&
          activeScooterAttackers < MAX_CONCURRENT_SCOOTER_ATTACKS
        ) {
          h.phase = HazardPhase.Windup;
          h.phaseTimer = CROSSING_WARNING_SEC;
          activeScooterAttackers++;
          startedWindups.push(h);
        }
      } else if (h.phase === HazardPhase.Windup) {
        const dx = h.dashEnd.x - h.x;
        const dz = h.dashEnd.z - h.z;
        h.yaw = Math.atan2(dx, dz);
        if (h.phaseTimer <= 0) {
          h.phase = HazardPhase.Active;
          h.phaseTimer = 2.8;
        }
      } else if (h.phase === HazardPhase.Active) {
        const dx = h.dashEnd.x - h.x;
        const dz = h.dashEnd.z - h.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.25 || h.phaseTimer <= 0) {
          const revYaw = Math.atan2(
            h.dashStart.x - h.dashEnd.x,
            h.dashStart.z - h.dashEnd.z,
          );
          const shiftX = -Math.cos(revYaw) * (RIGHT_LANE_OFFSET * 2);
          const shiftZ = Math.sin(revYaw) * (RIGHT_LANE_OFFSET * 2);
          const nextStart = {
            x: h.dashEnd.x + shiftX,
            z: h.dashEnd.z + shiftZ,
          };
          const nextEnd = {
            x: h.dashStart.x + shiftX,
            z: h.dashStart.z + shiftZ,
          };
          h.dashStart = nextStart;
          h.dashEnd = nextEnd;
          h.x = nextStart.x;
          h.z = nextStart.z;
          h.yaw = revYaw;
          h.phase = HazardPhase.Recovery;
          h.phaseTimer = 1.4;
        } else {
          const slowMult = (h.bumpTimer ?? 0) > 0.15 ? 0.35 : 1.0;
          const step = Math.min(dist, h.speed * slowMult * clampedDt);
          h.x += (dx / dist) * step;
          h.z += (dz / dist) * step;
          h.yaw = Math.atan2(dx, dz);
        }
      } else if (h.phase === HazardPhase.Recovery) {
        if (h.phaseTimer <= 0) {
          h.phase = HazardPhase.Idle;
          h.phaseTimer = 0.8;
        }
      }
    } else if (h.kind === HazardKind.BridgeGate) {
      h.phaseTimer -= clampedDt;
      if (h.phase === HazardPhase.Idle && h.phaseTimer <= 0) {
        h.phase = HazardPhase.Windup;
        h.phaseTimer = 1.25;
        startedWindups.push(h);
      } else if (h.phase === HazardPhase.Windup && h.phaseTimer <= 0) {
        h.phase = HazardPhase.Active;
        h.phaseTimer = 2.2;
      } else if (h.phase === HazardPhase.Active && h.phaseTimer <= 0) {
        h.phase = HazardPhase.Idle;
        h.phaseTimer = 4.6;
      }
    }
  }

  // 2. Pairwise AI-vs-AI Solid 3D Capsule Separation (Zero Ghosting Between Cars/Scooters/Rival!)
  for (let i = 0; i < hazards.length; i++) {
    const a = hazards[i];
    if (a.kind === HazardKind.BridgeGate) continue;
    const specA = getHazardCapsuleSpec(a);

    for (let j = i + 1; j < hazards.length; j++) {
      const b = hazards[j];
      if (b.kind === HazardKind.BridgeGate) continue;
      if (Math.abs(a.x - b.x) > 2.4 || Math.abs(a.z - b.z) > 2.4) continue;

      const specB = getHazardCapsuleSpec(b);
      const contact = closestCapsuleContact(
        a.x,
        a.z,
        a.yaw,
        specA,
        b.x,
        b.z,
        b.yaw,
        specB,
      );
      if (contact.penetration > 0) {
        const totalSep = contact.penetration + 0.024;
        const origAx = a.x;
        const origAz = a.z;
        const moveA = clampHazardMove(
          city,
          a.x,
          a.z,
          a.x + contact.nx * (totalSep * 0.52),
          a.z + contact.nz * (totalSep * 0.52),
        );
        a.x = moveA.x;
        a.z = moveA.z;
        const movedA = (a.x - origAx) * contact.nx + (a.z - origAz) * contact.nz;
        const remForB = Math.max(totalSep * 0.52, totalSep - movedA);
        const origBx = b.x;
        const origBz = b.z;
        const moveB = clampHazardMove(
          city,
          b.x,
          b.z,
          b.x - contact.nx * remForB,
          b.z - contact.nz * remForB,
        );
        b.x = moveB.x;
        b.z = moveB.z;
        const movedB = (origBx - b.x) * contact.nx + (origBz - b.z) * contact.nz;
        if (movedA + movedB < totalSep - 0.002) {
          const extraA = totalSep - (movedA + movedB);
          const moveA2 = clampHazardMove(
            city,
            a.x,
            a.z,
            a.x + contact.nx * extraA,
            a.z + contact.nz * extraA,
          );
          a.x = moveA2.x;
          a.z = moveA2.z;
        }

        const aSpd = a.kind === HazardKind.Cruiser ? a.currentSpeed : a.phase === HazardPhase.Active ? a.speed : 0;
        const bSpd = b.kind === HazardKind.Cruiser ? b.currentSpeed : b.phase === HazardPhase.Active ? b.speed : 0;
        const relSpd = Math.hypot(
          Math.sin(a.yaw) * aSpd - Math.sin(b.yaw) * bSpd,
          Math.cos(a.yaw) * aSpd - Math.cos(b.yaw) * bSpd,
        );

        a.currentSpeed *= 0.25;
        b.currentSpeed *= 0.25;
        a.bumpVx = contact.nx * 1.9;
        a.bumpVz = contact.nz * 1.9;
        b.bumpVx = -contact.nx * 1.9;
        b.bumpVz = -contact.nz * 1.9;
        a.bumpTimer = Math.max(a.bumpTimer ?? 0, 0.36);
        b.bumpTimer = Math.max(b.bumpTimer ?? 0, 0.36);

        if (
          (relSpd > 0.85 || contact.penetration > 0.06) &&
          (a.crashCooldown ?? 0) <= 0 &&
          (b.crashCooldown ?? 0) <= 0
        ) {
          a.crashCooldown = 0.9;
          b.crashCooldown = 0.9;
          crashEvents.push({
            x: contact.cx,
            y: 0.48,
            z: contact.cz,
            nx: contact.nx,
            nz: contact.nz,
            kind: 'ai_vehicle',
            severity: 'bump',
            label: 'Traffic Fender-Bender!',
            involvesPlayer: false,
            hazardId: a.id,
          });
        }
      }
    }

    // AI Hazard vs Rival Courier ("Zoomy Blitz") solid separation
    if (city?.rivalCourier) {
      const rv = city.rivalCourier;
      if (Math.abs(a.x - rv.x) <= 2.4 && Math.abs(a.z - rv.z) <= 2.4) {
        const contact = closestCapsuleContact(
          a.x,
          a.z,
          a.yaw,
          specA,
          rv.x,
          rv.z,
          rv.yaw,
          RIVAL_CAPSULE,
        );
        if (contact.penetration > 0) {
          const halfPush = contact.penetration * 0.54 + 0.012;
          const moveA = clampHazardMove(
            city,
            a.x,
            a.z,
            a.x + contact.nx * halfPush,
            a.z + contact.nz * halfPush,
          );
          const moveRv = clampHazardMove(
            city,
            rv.x,
            rv.z,
            rv.x - contact.nx * halfPush,
            rv.z - contact.nz * halfPush,
          );
          a.x = moveA.x;
          a.z = moveA.z;
          rv.x = moveRv.x;
          rv.z = moveRv.z;
          a.currentSpeed *= 0.25;
          a.bumpTimer = Math.max(a.bumpTimer ?? 0, 0.36);
          rv.bumpTimer = Math.max(rv.bumpTimer ?? 0, 0.36);
        }
      }
    }
  }

  // 3. Unconditional Solid 3D Hero Van vs Hazards & Rival Courier Separation + Crash Events
  if (truck.y < 0.45) {
    for (let i = 0; i < hazards.length; i++) {
      const h = hazards[i];
      if (h.kind === HazardKind.BridgeGate) continue;
      if (Math.abs(truck.x - h.x) > 2.6 || Math.abs(truck.z - h.z) > 2.6) continue;

      const specH = getHazardCapsuleSpec(h);
      const contact = closestCapsuleContact(
        truck.x,
        truck.z,
        truck.yaw,
        TRUCK_CAPSULE,
        h.x,
        h.z,
        h.yaw,
        specH,
      );

      if (contact.penetration > 0) {
        // Always separate physically even if truck.invulnTimer > 0 so vehicles NEVER ghost through each other!
        const totalSep = contact.penetration + 0.025;
        const origHx = h.x;
        const origHz = h.z;
        const moveH = clampHazardMove(
          city,
          h.x,
          h.z,
          h.x - contact.nx * (totalSep * 0.38),
          h.z - contact.nz * (totalSep * 0.38),
        );
        h.x = moveH.x;
        h.z = moveH.z;
        const hazMoved = (origHx - h.x) * contact.nx + (origHz - h.z) * contact.nz;
        const remTruck = Math.max(totalSep * 0.65, totalSep - hazMoved);
        const candTruckX = truck.x + contact.nx * remTruck;
        const candTruckZ = truck.z + contact.nz * remTruck;
        if (!city || isPositionDrivable(city, candTruckX, candTruckZ, TRUCK_RADIUS * 0.9, truck.y)) {
          truck.x = candTruckX;
          truck.z = candTruckZ;
        } else {
          const moveHFull = clampHazardMove(
            city,
            h.x,
            h.z,
            h.x - contact.nx * (totalSep - hazMoved),
            h.z - contact.nz * (totalSep - hazMoved),
          );
          h.x = moveHFull.x;
          h.z = moveHFull.z;
        }

        const hazSpd =
          h.kind === HazardKind.Cruiser
            ? h.currentSpeed
            : h.phase === HazardPhase.Active
              ? h.speed
              : 0;
        const relVn =
          (truck.vx - Math.sin(h.yaw) * hazSpd) * contact.nx +
          (truck.vz - Math.cos(h.yaw) * hazSpd) * contact.nz;

        const reboundSpd = Math.max(3.6, Math.min(6.4, Math.abs(relVn) * 0.55 + 3.1));
        truck.vx = contact.nx * reboundSpd;
        truck.vz = contact.nz * reboundSpd;
        truck.boostTimer = 0;
        truck.wallCrashCooldown = Math.max(truck.wallCrashCooldown ?? 0, 0.38);

        h.currentSpeed *= 0.2;
        h.bumpVx = -contact.nx * 3.2;
        h.bumpVz = -contact.nz * 3.2;
        h.bumpTimer = 0.48;

        const canHurt =
          h.kind === HazardKind.Cruiser ||
          h.phase === HazardPhase.Active ||
          truck.speed > 2.6;

        let heavyCrash = false;
        if (!playerHitBy && truck.invulnTimer <= 0 && canHurt) {
          playerHitBy = h;
          heavyCrash = true;
          if (truck.hasBumperShield) {
            truck.hasBumperShield = false;
            shieldAbsorbed = true;
            truck.invulnTimer = 1.25;
            truck.squashY = 1.16;
            truck.squashVel = -2.6;
          } else {
            truck.health = Math.max(0, truck.health - 1);
            truck.fragileIntact = false;
            truck.invulnTimer = 1.65;
            truck.squashY = 1.26;
            truck.squashVel = -3.9;
            truck.pitchAngle = 0.095;
          }
        } else {
          truck.squashY = Math.max(truck.squashY, 1.14);
          truck.squashVel = Math.min(truck.squashVel, -2.2);
        }

        if ((h.crashCooldown ?? 0) <= 0) {
          h.crashCooldown = 0.52;
          if (h.kind === HazardKind.Cruiser) {
            h.honkVisualTimer = 0.75;
          }
          crashEvents.push({
            x: contact.cx,
            y: 0.54,
            z: contact.cz,
            nx: contact.nx,
            nz: contact.nz,
            kind: 'vehicle',
            severity: heavyCrash ? 'crash' : 'bump',
            label: h.isBus
              ? 'Minibus Crash!'
              : h.kind === HazardKind.ScooterDash
                ? 'Scooter Fender-Bender!'
                : 'Traffic Crash!',
            involvesPlayer: true,
            hazardId: h.id,
          });
        }
      } else if (
        truck.invulnTimer <= 0 &&
        (h.kind === HazardKind.Cruiser ||
          (h.kind === HazardKind.ScooterDash && h.phase === HazardPhase.Active))
      ) {
        const surfaceGap = -contact.penetration;
        if (
          surfaceGap >= 0.02 &&
          surfaceGap <= 0.72 &&
          truck.speed > 5.0 &&
          !truck.isWrongWay &&
          (h.nearMissCooldown ?? 0) <= 0
        ) {
          h.nearMissCooldown = 4.5;
          truck.boostCooldown = Math.max(0, truck.boostCooldown - 0.85);
          nearMissCount += 1;
        }
      }
    }

    // Solid 3D Hero Van vs Rival Courier ("Zoomy Blitz") Collision & Trading-Paint Bounce!
    if (city?.rivalCourier) {
      const rv = city.rivalCourier;
      if (Math.abs(truck.x - rv.x) <= 2.6 && Math.abs(truck.z - rv.z) <= 2.6) {
        const contact = closestCapsuleContact(
          truck.x,
          truck.z,
          truck.yaw,
          TRUCK_CAPSULE,
          rv.x,
          rv.z,
          rv.yaw,
          RIVAL_CAPSULE,
        );
        if (contact.penetration > 0) {
          const totalSep = contact.penetration + 0.025;
          const origRvX = rv.x;
          const origRvZ = rv.z;
          const moveRv = clampHazardMove(
            city,
            rv.x,
            rv.z,
            rv.x - contact.nx * (totalSep * 0.45),
            rv.z - contact.nz * (totalSep * 0.45),
          );
          rv.x = moveRv.x;
          rv.z = moveRv.z;
          const rvMoved = (origRvX - rv.x) * contact.nx + (origRvZ - rv.z) * contact.nz;
          const remTruck = Math.max(totalSep * 0.58, totalSep - rvMoved);
          const candTruckX = truck.x + contact.nx * remTruck;
          const candTruckZ = truck.z + contact.nz * remTruck;
          if (isPositionDrivable(city, candTruckX, candTruckZ, TRUCK_RADIUS * 0.9, truck.y)) {
            truck.x = candTruckX;
            truck.z = candTruckZ;
          } else {
            const moveRvFull = clampHazardMove(
              city,
              rv.x,
              rv.z,
              rv.x - contact.nx * (totalSep - rvMoved),
              rv.z - contact.nz * (totalSep - rvMoved),
            );
            rv.x = moveRvFull.x;
            rv.z = moveRvFull.z;
          }

          truck.vx = contact.nx * 4.4;
          truck.vz = contact.nz * 4.4;
          truck.wallCrashCooldown = Math.max(truck.wallCrashCooldown ?? 0, 0.38);
          truck.squashY = 1.2;
          truck.squashVel = -3.1;
          if (!truck.hasBumperShield) {
            truck.fragileIntact = false;
          }

          rv.bumpVx = -contact.nx * 3.8;
          rv.bumpVz = -contact.nz * 3.8;
          rv.bumpTimer = 0.5;

          if ((rv.crashCooldown ?? 0) <= 0) {
            rv.crashCooldown = 0.55;
            crashEvents.push({
              x: contact.cx,
              y: 0.56,
              z: contact.cz,
              nx: contact.nx,
              nz: contact.nz,
              kind: 'rival',
              severity: 'crash',
              label: 'Bumped Zoomy Blitz!',
              involvesPlayer: true,
              rivalHit: true,
            });
          }
        }
      }
    }
  }

  return {
    startedWindups,
    playerHitBy,
    shieldAbsorbed,
    nearMissCount,
    crashEvents,
    honkEvents,
  };
}
