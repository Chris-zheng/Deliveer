/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Local ghost line: one run's truck path, stored per level (or per daily
 * challenge date) in localStorage. A sample is [seconds, x, z, yaw] with the
 * numbers rounded so the payload stays small enough for a 5 MB quota.
 */

export type GhostSample = [number, number, number, number];

export interface GhostTrack {
  score: number;
  samples: GhostSample[];
}

const STORAGE_KEY = 'courier_field_ghost_v1';
export const GHOST_MAX_SAMPLES = 900;

type GhostStore = Record<string, GhostTrack>;

/** Node/test fallback so persistence semantics stay observable without a browser. */
let memoryStore: GhostStore = {};

function readStore(): GhostStore {
  if (typeof window === 'undefined') return memoryStore;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as GhostStore) : {};
  } catch {
    return {};
  }
}

function writeStore(store: GhostStore): void {
  if (typeof window === 'undefined') {
    memoryStore = store;
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota or sandboxed storage: the ghost line is cosmetic, drop it.
  }
}

export function encodeGhostSample(
  elapsedSec: number,
  x: number,
  z: number,
  yaw: number,
): GhostSample {
  return [
    Math.round(elapsedSec * 100) / 100,
    Math.round(x * 100) / 100,
    Math.round(z * 100) / 100,
    Math.round(yaw * 1000) / 1000,
  ];
}

export function isGhostSample(value: unknown): value is GhostSample {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((n) => typeof n === 'number' && Number.isFinite(n))
  );
}

export function loadGhost(key: string): GhostTrack | null {
  const track = readStore()[key];
  if (!track || !Array.isArray(track.samples)) return null;
  const samples = track.samples.filter(isGhostSample);
  if (samples.length < 2) return null;
  return { score: typeof track.score === 'number' ? track.score : 0, samples };
}

export function saveGhost(key: string, score: number, samples: GhostSample[]): boolean {
  const clean = samples.filter(isGhostSample).slice(0, GHOST_MAX_SAMPLES);
  if (clean.length < 2) return false;
  const store = readStore();
  const current = store[key];
  if (current && typeof current.score === 'number' && current.score >= score) return false;
  store[key] = { score, samples: clean };
  writeStore(store);
  return true;
}

/** Linear interpolation of the recorded path at an arbitrary run second. */
export function sampleGhostAt(samples: GhostSample[], elapsedSec: number): GhostSample | null {
  if (samples.length === 0) return null;
  if (elapsedSec <= samples[0][0]) return samples[0];
  const last = samples[samples.length - 1];
  if (elapsedSec >= last[0]) return last;
  for (let i = 1; i < samples.length; i += 1) {
    const prev = samples[i - 1];
    const next = samples[i];
    if (elapsedSec <= next[0]) {
      const span = next[0] - prev[0];
      const t = span > 0 ? (elapsedSec - prev[0]) / span : 0;
      return [
        elapsedSec,
        prev[1] + (next[1] - prev[1]) * t,
        prev[2] + (next[2] - prev[2]) * t,
        prev[3] + (next[3] - prev[3]) * t,
      ];
    }
  }
  return last;
}
