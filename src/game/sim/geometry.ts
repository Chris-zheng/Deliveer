/**
 * src/game/sim/geometry.ts
 *
 * Extracted verbatim from src/game/rules.ts — no logic changes.
 * Public API is re-exported by src/game/rules.ts.
 */

import {
  GeneratedCity,
} from '../types';

import {
  isDrivableTile,
} from '../proceduralCity';

export function wrapAngleRad(a: number): number {
  let w = a;
  while (w > Math.PI) w -= Math.PI * 2;
  while (w < -Math.PI) w += Math.PI * 2;
  return w;
}

export function countDrivableNeighbors(city: GeneratedCity, col: number, row: number): number {
  let deg = 0;
  if (isDrivableTile(city.tiles[row]?.[col + 1])) deg++;
  if (isDrivableTile(city.tiles[row]?.[col - 1])) deg++;
  if (isDrivableTile(city.tiles[row + 1]?.[col])) deg++;
  if (isDrivableTile(city.tiles[row - 1]?.[col])) deg++;
  return deg;
}

export function quinticSmoothstep(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t * t * t * (t * (t * 6 - 15) + 10);
}
