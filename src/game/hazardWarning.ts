import type { TrafficHazard } from './types';
import { HazardKind, HazardPhase } from './types';
import type { WorldPos } from './types';

/**
 * Readability budget for a crossing hazard: the player must see the coning
 * stripe for long enough to lift off the throttle, but the wait must not feel
 * like a cutscene. Tuned to 0.75s (the brief asked for 0.6-0.9s).
 */
export const CROSSING_WARNING_SEC = 0.75;

/** Spawns closer than this to the truck's starting spot are unfair. */
export const MIN_SPAWN_CLEARANCE = 14;

/** Two hazards must never pop in on the same patch of road back to back. */
export const SAME_SPOT_SEC = 2;
export const SAME_SPOT_RADIUS = 3.2;

/** The rival van may never out-run 75% of the player's top speed. */
export const RIVAL_SPEED_RATIO = 0.75;

/** Only the dashing scooter "crosses" lanes; cruisers just drive the loop. */
export function isCrossingHazard(h: TrafficHazard): boolean {
  return h.kind === HazardKind.ScooterDash;
}

/** The warning window is the windup phase of a crossing hazard. */
export function isCrossingWarningActive(h: TrafficHazard): boolean {
  return isCrossingHazard(h) && h.phase === HazardPhase.Windup;
}

/** Blink curve for the painted warning stripe (0.30 .. 0.72 opacity). */
export function warningPulse(clock: number): number {
  const t = 0.5 + 0.5 * Math.sin(clock * 18);
  return 0.3 + 0.42 * t;
}

/**
 * Keeps generated traffic fair: drop any start point that sits inside the
 * player's personal space or on top of an already claimed start.
 */
export function pickFairStarts<T>(
  candidates: readonly T[],
  getStart: (item: T) => WorldPos,
  spawn: WorldPos,
  limit: number,
): T[] {
  const picked: T[] = [];
  const taken: WorldPos[] = [];
  for (const item of candidates) {
    if (picked.length >= limit) break;
    const p = getStart(item);
    if (Math.hypot(p.x - spawn.x, p.z - spawn.z) < MIN_SPAWN_CLEARANCE) continue;
    // A hazard entering the same junction within SAME_SPOT_SEC of a previous
    // one would read as a single unfair wall of traffic.
    const crowd = taken.some((t) => Math.hypot(p.x - t.x, p.z - t.z) < SAME_SPOT_RADIUS);
    if (crowd) continue;
    taken.push({ x: p.x, z: p.z });
    picked.push(item);
  }
  return picked;
}