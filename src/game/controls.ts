/**
 * src/game/controls.ts
 *
 * Player-facing comfort settings: the chase-camera framing mode and the
 * handling feel preset. Both are read by the per-frame simulation, so they live
 * in a module-level singleton (the React shell pushes, the sim reads) instead of
 * being threaded through every canvas signature.
 */

export type ViewMode = 'chase' | 'far' | 'top' | 'hood' | 'cockpit';
export type HandlingPreset = 'beginner' | 'balanced' | 'arcade';

export const VIEW_MODES: ViewMode[] = ['chase', 'far', 'top', 'hood', 'cockpit'];
export const HANDLING_PRESETS: HandlingPreset[] = ['beginner', 'balanced', 'arcade'];

export const VIEW_MODE_LABELS: Record<ViewMode, { zh: string; en: string }> = {
  chase: { zh: '贴近', en: 'Chase' },
  far: { zh: '远景', en: 'Far' },
  top: { zh: '俯视', en: 'Top' },
  hood: { zh: '车头', en: 'Bumper' },
  cockpit: { zh: '驾驶舱', en: 'Cockpit' },
};

export const HANDLING_LABELS: Record<HandlingPreset, { zh: string; en: string }> = {
  beginner: { zh: '新手辅助', en: 'Beginner' },
  balanced: { zh: '普通均衡', en: 'Normal' },
  arcade: { zh: '高手竞速', en: 'Pro' },
};

export interface DifficultyIndicatorMeta {
  labelEn: 'Beginner' | 'Normal' | 'Pro';
  labelZh: string;
  icon: string;
  bars: 1 | 2 | 3;
}

export const DIFFICULTY_INDICATOR: Record<HandlingPreset, DifficultyIndicatorMeta> = {
  beginner: {
    labelEn: 'Beginner',
    labelZh: '新手 · Beginner',
    icon: '🛡️',
    bars: 1,
  },
  balanced: {
    labelEn: 'Normal',
    labelZh: '普通 · Normal',
    icon: '⚖️',
    bars: 2,
  },
  arcade: {
    labelEn: 'Pro',
    labelZh: '高手 · Pro',
    icon: '🏁',
    bars: 3,
  },
};

export const HANDLING_DESCRIPTIONS: Record<HandlingPreset, { zh: string; en: string }> = {
  beginner: {
    zh: '限速稳控 · 自动回正车道 · 轻微蹭墙不扣分',
    en: 'Beginner assist · Calmer speed · Strong lane auto-align · Forgiving curb scrapes',
  },
  balanced: {
    zh: '推荐手感 · 循迹过弯 · 真实刹车/漂移反馈',
    en: 'Normal balanced · Predictable cornering · True trail-brake & drift',
  },
  arcade: {
    zh: '极速响应 · 转向自动补油 · 锐利飘移过弯',
    en: 'Pro arcade · Instant response · Auto-creep turns · Sharp drift bites',
  },
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
  // Hood and cockpit override the chase rig directly in cameraFrame.
  hood: { back: 1.0, up: 1.0, lookAhead: 1.0, fov: 1.0 },
  cockpit: { back: 1.0, up: 1.0, lookAhead: 1.0, fov: 1.0 },
};

/** Handling feel & driving-difficulty assist numbers. Every field is consumed by `sim/truck.ts`. */
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
  /**
   * Speed (world units/s) at which steering reaches full authority.
   * Below it the van only creeps round, so a tap at a standstill cannot spin it.
   */
  steerRampSpeed: number;
  /** Tightest turn circle radius in world units at a crawl (arcade radius-first steering). */
  minTurnRadius: number;
  /** Extra turn radius granted per unit/second of speed. */
  turnRadiusPerSpeed: number;
  /** Overall top speed multiplier (lets beginner mode pace down gently). */
  maxSpeedScale: number;
  /** Max heading error (rad) where throttle auto-straightens toward nearest cardinal lane. */
  autoAlignRad: number;
  /** Exponential rate for heading auto-straightening. */
  autoAlignRate: number;
  /** Lateral speed (units/s) pulling the van gently back to right-hand lane center. */
  laneCenterRate: number;
  /** Axis impact speed threshold before wall/curb grazing triggers bounce & fragile break. */
  curbBounceSpeed: number;
  /** Prop impact speed threshold before roadside prop bumps break fragile cargo. */
  propBounceSpeed: number;
  /** Multiplier for wrong-way ticket meter accumulation rate. */
  wrongWayRateScale: number;
  /** Minimum speed at which steering auto-triggers drift without holding C. */
  driftEntrySpeed: number;
}

export const HANDLING_PROFILES: Record<HandlingPreset, HandlingProfile> = {
  // Beginner: calmer top speed, smooth steering filter, auto-creep on turns, strong lane straightening, forgiving curb scrapes.
  beginner: {
    turnSpeedRad: 3.15,
    highSpeedTurnMult: 0.86,
    accelExp: 8.8,
    boostAccelExp: 8.2,
    coastDrag: 7.8,
    steerSmoothSec: 0.095,
    steerAssistThrottle: 0.52,
    steerRampSpeed: 1.1,
    minTurnRadius: 1.18,
    turnRadiusPerSpeed: 0.095,
    maxSpeedScale: 0.84,
    autoAlignRad: 0.62,
    autoAlignRate: 8.2,
    laneCenterRate: 2.25,
    curbBounceSpeed: 3.4,
    propBounceSpeed: 3.0,
    wrongWayRateScale: 0.5,
    driftEntrySpeed: 7.8,
  },
  // Balanced: forgiving radius-first steering that clears 90-degree city intersections cleanly at speed.
  balanced: {
    turnSpeedRad: 3.6,
    highSpeedTurnMult: 0.78,
    accelExp: 11.2,
    boostAccelExp: 10.5,
    coastDrag: 6.5,
    steerSmoothSec: 0.065,
    steerAssistThrottle: 0,
    steerRampSpeed: 1.4,
    minTurnRadius: 1.25,
    turnRadiusPerSpeed: 0.11,
    maxSpeedScale: 1.0,
    autoAlignRad: 0.24,
    autoAlignRate: 4.2,
    laneCenterRate: 1.15,
    curbBounceSpeed: 2.1,
    propBounceSpeed: 1.9,
    wrongWayRateScale: 1.0,
    driftEntrySpeed: 6.2,
  },
  // Snappy arcade drift feel with sharp low-radius response.
  arcade: {
    turnSpeedRad: 4.1,
    highSpeedTurnMult: 1.0,
    accelExp: 13.5,
    boostAccelExp: 13.0,
    coastDrag: 9.5,
    steerSmoothSec: 0,
    steerAssistThrottle: 0.68,
    steerRampSpeed: 0,
    minTurnRadius: 1.05,
    turnRadiusPerSpeed: 0.08,
    maxSpeedScale: 1.0,
    autoAlignRad: 0.18,
    autoAlignRate: 3.2,
    laneCenterRate: 0.75,
    curbBounceSpeed: 2.1,
    propBounceSpeed: 1.9,
    wrongWayRateScale: 1.0,
    driftEntrySpeed: 5.8,
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
  return (
    value === 'chase' ||
    value === 'far' ||
    value === 'top' ||
    value === 'hood' ||
    value === 'cockpit'
  );
}

function isHandling(value: unknown): value is HandlingPreset {
  return value === 'beginner' || value === 'balanced' || value === 'arcade';
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

