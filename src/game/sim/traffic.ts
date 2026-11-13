/**
 * src/game/sim/traffic.ts
 *
 * Extracted verbatim from src/game/rules.ts — no logic changes.
 * Public API is re-exported by src/game/rules.ts.
 */

import {
  CoffeeKiosk,
  DeliveryStop,
  DuckCrossing,
  HazardKind,
  HazardPhase,
  MechanicGarage,
  RivalCourier,
  SidewalkPedestrian,
  SignalAxisState,
  TrafficHazard,
  TrafficSignal,
  TruckState,
} from '../types';

/**
 * Steps 4-phase intersection Traffic Signals:
 * EWGreen (6.5s) -> EWYellow (1.8s) -> NSGreen (6.5s) -> NSYellow (1.8s)
 */
export function stepTrafficSignals(signals: TrafficSignal[], dt: number): void {
  const clampedDt = Math.min(dt, 0.05);
  for (const sig of signals) {
    sig.timer -= clampedDt;
    if (sig.timer <= 0) {
      if (sig.state === SignalAxisState.EWGreen) {
        sig.state = SignalAxisState.EWYellow;
        sig.timer = 1.8;
      } else if (sig.state === SignalAxisState.EWYellow) {
        sig.state = SignalAxisState.NSGreen;
        sig.timer = 6.5;
      } else if (sig.state === SignalAxisState.NSGreen) {
        sig.state = SignalAxisState.NSYellow;
        sig.timer = 1.8;
      } else {
        sig.state = SignalAxisState.EWGreen;
        sig.timer = 6.5;
      }
    }
  }
}

/**
 * Steps Drive-Thru Roadside Espresso Boost Kiosks!
 */
export function stepCoffeeKiosks(
  kiosks: CoffeeKiosk[],
  truck: TruckState,
  dt: number,
): CoffeeKiosk | null {
  const clampedDt = Math.min(dt, 0.05);
  let picked: CoffeeKiosk | null = null;
  for (const k of kiosks) {
    if (k.cooldown > 0) {
      k.cooldown = Math.max(0, k.cooldown - clampedDt);
    } else if (
      !picked &&
      Math.hypot(truck.x - k.roadX, truck.z - k.roadZ) < 1.35
    ) {
      k.cooldown = 16.0;
      truck.boostCooldown = 0;
      truck.boostTimer = Math.max(truck.boostTimer, 1.45);
      truck.squashY = 0.8;
      truck.squashVel = 4.0;
      picked = k;
    }
  }
  return picked;
}

/**
 * Steps Roadside Wrench Mechanic Pit-Stop Garages (+1 Hull HP & Bumper Shield!)
 */
export function stepMechanicGarages(
  garages: MechanicGarage[],
  truck: TruckState,
  dt: number,
): MechanicGarage | null {
  const clampedDt = Math.min(dt, 0.05);
  let serviced: MechanicGarage | null = null;
  for (const g of garages) {
    if (g.cooldown > 0) {
      g.cooldown = Math.max(0, g.cooldown - clampedDt);
    } else if (
      !serviced &&
      (truck.health < truck.maxHealth || !truck.hasBumperShield) &&
      Math.hypot(truck.x - g.roadX, truck.z - g.roadZ) < 1.4
    ) {
      g.cooldown = 18.0;
      truck.health = Math.min(truck.maxHealth, truck.health + 1);
      truck.hasBumperShield = true;
      truck.squashY = 0.82;
      truck.squashVel = 3.8;
      serviced = g;
    }
  }
  return serviced;
}

/**
 * Steps Waddling Duckling Family Crossings + Polite Braking Bonus!
 */
export function stepDuckCrossings(
  ducks: DuckCrossing[],
  truck: TruckState,
  dt: number,
): DuckCrossing | null {
  const clampedDt = Math.min(dt, 0.05);
  let politeRewardDuck: DuckCrossing | null = null;

  for (const d of ducks) {
    d.phase += clampedDt * d.speed;
    if (d.speed > 0.95) {
      d.speed = Math.max(0.95, d.speed - clampedDt * 0.8);
    }
    const u = 0.5 - 0.5 * Math.cos(d.phase);
    const dirSign = Math.sin(d.phase) >= 0 ? 1 : -1;
    const dx = d.end.x - d.start.x;
    const dz = d.end.z - d.start.z;
    d.x = d.start.x + dx * u;
    d.z = d.start.z + dz * u;
    d.yaw = Math.atan2(dx * dirSign, dz * dirSign);

    const dist = Math.hypot(truck.x - d.x, truck.z - d.z);
    if (
      !d.politeBonusClaimed &&
      dist > 0.9 &&
      dist < 3.6 &&
      (truck.isBraking || (truck.speed > 0.1 && truck.speed < 3.4))
    ) {
      d.politeBonusClaimed = true;
      politeRewardDuck = d;
    }
  }
  return politeRewardDuck;
}

/**
 * Steps Moving Porch Customers smoothly oscillating along their courtyard front!
 */
export function stepMovingCustomers(
  stops: DeliveryStop[],
  visualClock: number,
): void {
  for (const s of stops) {
    if (s.delivered || !s.isMovingCustomer || !s.patrolStart || !s.patrolEnd) {
      continue;
    }
    const u = 0.5 + 0.5 * Math.sin(visualClock * 2.1 + s.index);
    s.liveCitizenX = s.patrolStart.x + (s.patrolEnd.x - s.patrolStart.x) * u;
    s.liveCitizenZ = s.patrolStart.z + (s.patrolEnd.z - s.patrolStart.z) * u;
  }
}

/**
 * Steps Rival Courier ("Zoomy Blitz") racing toward the Golden Bonus Drop!
 */
export function stepRivalCourier(
  rival: RivalCourier | null,
  truck: TruckState,
  dt: number,
): 'player_claimed' | 'rival_claimed' | null {
  if (!rival || rival.waypoints.length < 2) return null;
  const clampedDt = Math.min(dt, 0.05);

  if (rival.bumpTimer && rival.bumpTimer > 0) {
    rival.bumpTimer = Math.max(0, rival.bumpTimer - clampedDt);
  }
  if (rival.crashCooldown && rival.crashCooldown > 0) {
    rival.crashCooldown = Math.max(0, rival.crashCooldown - clampedDt);
  }
  if (rival.bumpVx || rival.bumpVz) {
    const bvx = rival.bumpVx ?? 0;
    const bvz = rival.bumpVz ?? 0;
    rival.x += bvx * clampedDt;
    rival.z += bvz * clampedDt;
    const decay = Math.exp(-9.5 * clampedDt);
    rival.bumpVx = Math.abs(bvx * decay) < 0.04 ? 0 : bvx * decay;
    rival.bumpVz = Math.abs(bvz * decay) < 0.04 ? 0 : bvz * decay;
  }

  const target = rival.waypoints[rival.waypointIndex];
  const dx = target.x - rival.x;
  const dz = target.z - rival.z;
  const dist = Math.hypot(dx, dz);

  if (dist < 0.2) {
    rival.waypointIndex = (rival.waypointIndex + 1) % rival.waypoints.length;
    const nextT = rival.waypoints[rival.waypointIndex];
    rival.yaw = Math.atan2(nextT.x - rival.x, nextT.z - rival.z);
  } else {
    const bumpSlow = (rival.bumpTimer ?? 0) > 0.15 ? 0.35 : 1.0;
    const step = Math.min(dist, rival.speed * bumpSlow * clampedDt);
    rival.x += (dx / dist) * step;
    rival.z += (dz / dist) * step;
    rival.yaw = Math.atan2(dx, dz);
  }

  if (!rival.bonusClaimed && !rival.rivalWonBonus) {
    const playerDist = Math.hypot(
      truck.x - rival.bonusDropPos.x,
      truck.z - rival.bonusDropPos.z,
    );
    if (playerDist < 1.85) {
      rival.bonusClaimed = true;
      return 'player_claimed';
    }
  }

  return null;
}

/**
 * Friendly Musical Horn [Q / H]: calms winding scooters, waves pedestrians, and hurries ducklings!
 */
export function triggerMusicalHorn(
  truck: TruckState,
  hazards: TrafficHazard[],
  pedestrians: SidewalkPedestrian[],
  ducks: DuckCrossing[],
): { calmedScooters: number; wavedPedestrians: number; hurriedDucks: number } | null {
  if (truck.hornCooldown > 0) return null;
  truck.hornCooldown = 1.05;

  let calmedScooters = 0;
  let wavedPedestrians = 0;
  let hurriedDucks = 0;

  for (const h of hazards) {
    if (
      h.kind === HazardKind.ScooterDash &&
      Math.hypot(truck.x - h.x, truck.z - h.z) < 11.5
    ) {
      h.calmedByHornTimer = 2.6;
      if (h.phase === HazardPhase.Windup) {
        h.phase = HazardPhase.Idle;
        h.phaseTimer = 2.6;
      }
      calmedScooters++;
    }
  }

  for (const p of pedestrians) {
    if (Math.hypot(truck.x - p.x, truck.z - p.z) < 7.5) {
      p.waveTimer = 1.35;
      wavedPedestrians++;
    }
  }

  for (const d of ducks) {
    if (Math.hypot(truck.x - d.x, truck.z - d.z) < 8.0) {
      d.speed = 2.25;
      hurriedDucks++;
    }
  }

  return { calmedScooters, wavedPedestrians, hurriedDucks };
}
