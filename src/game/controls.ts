/**
 * src/game/controls.ts
 *
 * Player-facing comfort settings: the chase-camera framing mode and the
 * handling feel preset. Both are read by the per-frame simulation, so they live
 * in a module-level singleton (the React shell pushes, the sim reads) instead of
 * being threaded through every canvas signature.
 */

export type ViewMode = 'chase' | 'far' | 'top';
export type HandlingPreset = 'balanced' | 'arcade';

export const VIEW_MODES: ViewMode[] = ['chase', 'far', 'top'];
export const HANDLING_PRESETS: HandlingPreset[] = ['balanced', 'arcade'];

export const VIEW_MODE_LABELS: Record<ViewMode, { zh: string; en: string }> = {
  chase: { zh: '贴近', en: 'Chase' },
  far: { zh: '远景', en: 'Far' },
  top: { zh: '俯视', en: 'Top' },
};

export const HANDLING_LABELS: Record<HandlingPreset, { zh: string; en: string }> = {
  balanced: { zh: '均衡', en: 'Balanced' },
  arcade: { zh: '街机', en: 'Arcade' },
};

/**
 * Framing multipliers layered on top of the base chase camera. `top` trades
 * look-ahead for altitude, `far` simply backs the camera off a little.
 */
export const VIEW_FRAMING: Record<
  ViewMode,
  { back: number; up: number; lookAhead: number; fov: number }
> = {
  chase: { back: 1.0, up: 1.0, lookAhead: 1.0, fov: 1.0 },
  far: { back: 1.34, up: 1.46, lookAhead: 1.12, fov: 0.92 },
  top: { back: 0.6, up: 3.05, lookAhead: 1.5, fov: 0.86 },
};

/** Handling feel numbers. Every field is consumed by `sim/truck.ts`. */
export interface HandlingProfile {
  /** Base yaw rate in rad/s at full grip. */
  turnSpeedRad: number;
  /** Yaw rate multiplier once the van is at top speed (1 = no speed falloff). */
  highSpeedTurnMult: number;
  /** Throttle response exponent; lower is a softer, heavier launch. */
  accelExp: number;
  /** Boost response exponent. */
  boostAccelExp: number;
  /** Coast-down drag exponent when no throttle is held; lower coasts further. */
  coastDrag: number;
  /** Steering input smoothing time constant in seconds (0 = instant). */
  steerSmoothSec: number;
  /** Implicit throttle added while only steering (0 disables the assist). */
  steerAssistThrottle: number;
}

export const HANDLING_PROFILES: Record<HandlingPreset, HandlingProfile> = {
  // Soft launch, speed-sensitive steering, long coast: readable for new players.
  balanced: {
    turnSpeedRad: 3.4,
    highSpeedTurnMult: 0.55,
    accelExp: 8.5,
    boostAccelExp: 9.5,
    coastDrag: 6.5,
    steerSmoothSec: 0.12,
    steerAssistThrottle: 0,
  },
  // The pre-tuning arcade feel, kept for players who liked the sharp response.
  arcade: {
    turnSpeedRad: 3.9,
    highSpeedTurnMult: 1.0,
    accelExp: 13.0,
    boostAccelExp: 12.5,
    coastDrag: 9.5,
    steerSmoothSec: 0,
    steerAssistThrottle: 0.68,
  },
};

const STORAGE_KEY = 'deliveer_controls_v1';

interface StoredControls {
  viewMode: ViewMode;
  handling: HandlingPreset;
}

// New players start in the wide framing + balanced handling.
let viewMode: ViewMode = 'far';
let handling: HandlingPreset = 'balanced';
let loaded = false;

function isViewMode(value: unknown): value is ViewMode {
  return value === 'chase' || value === 'far' || value === 'top';
}

function isHandling(value: unknown): value is HandlingPreset {
  return value === 'balanced' || value === 'arcade';
}

function ensureLoaded(): void {
  if (loaded) return;
  loaded = true;
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<StoredControls>;
    if (isViewMode(parsed.viewMode)) viewMode = parsed.viewMode;
    if (isHandling(parsed.handling)) handling = parsed.handling;
  } catch {
    // Corrupt or unavailable storage simply falls back to the defaults.
  }
}

function persist(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ viewMode, handling }));
  } catch {
    // Ignore quota/private-mode failures.
  }
}

export function getViewMode(): ViewMode {
  ensureLoaded();
  return viewMode;
}

export function setViewMode(next: ViewMode): ViewMode {
  ensureLoaded();
  viewMode = isViewMode(next) ? next : 'far';
  persist();
  return viewMode;
}

export function cycleViewMode(): ViewMode {
  const current = getViewMode();
  const idx = VIEW_MODES.indexOf(current);
  return setViewMode(VIEW_MODES[(idx + 1) % VIEW_MODES.length]);
}

export function getHandlingPreset(): HandlingPreset {
  ensureLoaded();
  return handling;
}

export function getHandling(): HandlingProfile {
  return HANDLING_PROFILES[getHandlingPreset()];
}

export function setHandlingPreset(next: HandlingPreset): HandlingPreset {
  ensureLoaded();
  handling = isHandling(next) ? next : 'balanced';
  persist();
  return handling;
}
