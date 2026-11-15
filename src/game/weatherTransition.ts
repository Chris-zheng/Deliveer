/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure state machine and color/fog interpolation helpers for weather visuals
 * and phase-shift transitions into GamePhase.Playing.
 */

import { ShiftAtmosphere } from './types';
import type { WeatherKind } from './weather';

export interface AtmosphereVisualTarget {
  skyHex: number;
  fogNear: number;
  fogFar: number;
  sunIntensity: number;
  hemiIntensity: number;
}

export interface WeatherVisualState {
  /** Smoothly damped 0..1 blend weight toward stormy rain visuals. */
  rainMix: number;
  /** Smoothly damped 0..1 blend weight toward heavy fog / snow visuals. */
  fogMix: number;
  /** Smoothly damped 0..1 blend weight for gentle clear-level sunshowers. */
  sunshowerMix: number;
  /** Remaining seconds of the Playing phase-shift atmospheric transition pulse. */
  phaseBurstTimer: number;
  /** Total duration of the current Playing phase-shift transition pulse. */
  phaseBurstDuration: number;
  /** Normalized 0..1 bell envelope derived from phaseBurstTimer. */
  phaseBurstAlpha: number;
  /** Smoothed effective fog near distance (meters/world units). */
  fogNear: number;
  /** Smoothed effective fog far distance (meters/world units). */
  fogFar: number;
  /** Smoothed directional sunlight intensity. */
  sunIntensity: number;
  /** Smoothed hemisphere fill light intensity. */
  hemiIntensity: number;
  /** Derived 0..1 opacity for angled rain streaks. */
  rainOpacity: number;
  /** Derived 0..1 opacity for drifting fog/snow flakes & mist. */
  flakeOpacity: number;
  /** Derived 0..1 opacity for sunlit Playing-shift atmospheric motes. */
  breezeOpacity: number;
  /** True when fog/cold cities render crisp snowflakes vs soft coastal mist. */
  snowFlakeStyle: boolean;
}

const SNOWY_CITY_IDS = new Set<string>([
  'beijing',
  'seoul',
  'newyork',
  'paris',
  'london',
  'amsterdam',
]);

export function isSnowyAtmosphereCity(cityId?: string): boolean {
  if (!cityId) return false;
  return SNOWY_CITY_IDS.has(cityId);
}

export function computeAtmosphereBaseline(
  atmosphere: ShiftAtmosphere,
): AtmosphereVisualTarget {
  if (atmosphere === ShiftAtmosphere.GoldenSunset) {
    return {
      skyHex: 0xf4976c,
      fogNear: 58,
      fogFar: 128,
      sunIntensity: 1.62,
      hemiIntensity: 0.78,
    };
  }
  if (atmosphere === ShiftAtmosphere.TwilightNeon) {
    return {
      skyHex: 0x1d3557,
      fogNear: 54,
      fogFar: 122,
      sunIntensity: 0.96,
      hemiIntensity: 0.92,
    };
  }
  return {
    skyHex: 0x4bb7ef,
    fogNear: 58,
    fogFar: 125,
    sunIntensity: 1.48,
    hemiIntensity: 0.72,
  };
}

export const WEATHER_VISUAL_OVERRIDES: Record<
  'rain' | 'fog',
  AtmosphereVisualTarget
> = {
  rain: {
    skyHex: 0x5b6c75,
    fogNear: 34,
    fogFar: 96,
    sunIntensity: 0.92,
    hemiIntensity: 0.62,
  },
  fog: {
    skyHex: 0xd3e2e6,
    fogNear: 15,
    fogFar: 54,
    sunIntensity: 1.08,
    hemiIntensity: 0.66,
  },
};

export function createWeatherVisualState(
  atmosphere: ShiftAtmosphere = ShiftAtmosphere.SunnyHarbor,
): WeatherVisualState {
  const base = computeAtmosphereBaseline(atmosphere);
  return {
    rainMix: 0,
    fogMix: 0,
    sunshowerMix: 0,
    phaseBurstTimer: 0,
    phaseBurstDuration: 2.4,
    phaseBurstAlpha: 0,
    fogNear: base.fogNear,
    fogFar: base.fogFar,
    sunIntensity: base.sunIntensity,
    hemiIntensity: base.hemiIntensity,
    rainOpacity: 0,
    flakeOpacity: 0,
    breezeOpacity: 0,
    snowFlakeStyle: false,
  };
}

export function resetWeatherVisualState(
  state: WeatherVisualState,
  atmosphere: ShiftAtmosphere,
  kind: WeatherKind = 'clear',
  hasSunshower: boolean = false,
  cityId?: string,
): WeatherVisualState {
  const base = computeAtmosphereBaseline(atmosphere);
  state.rainMix = kind === 'rain' ? 1 : 0;
  state.fogMix = kind === 'fog' ? 1 : 0;
  state.sunshowerMix = hasSunshower ? 1 : 0;
  state.phaseBurstTimer = 0;
  state.phaseBurstAlpha = 0;
  state.snowFlakeStyle = isSnowyAtmosphereCity(cityId) || kind === 'fog';
  recomputeDerivedVisuals(state, base, kind);
  return state;
}

/**
 * Triggers a smooth visual transition burst when the game phase shifts into
 * GamePhase.Playing (from Title, GameOver, or Paused).
 */
export function triggerPlayingPhaseTransition(
  state: WeatherVisualState,
  durationSec: number = 2.4,
): void {
  const safeDur = Math.max(0.6, durationSec);
  state.phaseBurstDuration = safeDur;
  state.phaseBurstTimer = safeDur;
  state.phaseBurstAlpha = 0.35;
}

function clamp01(v: number): number {
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}

function recomputeDerivedVisuals(
  state: WeatherVisualState,
  base: AtmosphereVisualTarget,
  kind: WeatherKind,
): void {
  const rainW = state.rainMix;
  const fogW = state.fogMix;
  const clearW = Math.max(0, 1 - rainW - fogW);

  state.fogNear =
    base.fogNear * clearW +
    WEATHER_VISUAL_OVERRIDES.rain.fogNear * rainW +
    WEATHER_VISUAL_OVERRIDES.fog.fogNear * fogW;
  state.fogFar =
    base.fogFar * clearW +
    WEATHER_VISUAL_OVERRIDES.rain.fogFar * rainW +
    WEATHER_VISUAL_OVERRIDES.fog.fogFar * fogW;
  state.sunIntensity =
    base.sunIntensity * clearW +
    WEATHER_VISUAL_OVERRIDES.rain.sunIntensity * rainW +
    WEATHER_VISUAL_OVERRIDES.fog.sunIntensity * fogW;
  state.hemiIntensity =
    base.hemiIntensity * clearW +
    WEATHER_VISUAL_OVERRIDES.rain.hemiIntensity * rainW +
    WEATHER_VISUAL_OVERRIDES.fog.hemiIntensity * fogW;

  const effectiveRain = Math.max(rainW, state.sunshowerMix * 0.45);
  const pulse = state.phaseBurstAlpha;

  state.rainOpacity = clamp01(
    effectiveRain * 0.64 + (kind === 'rain' ? pulse * 0.24 : 0),
  );
  state.flakeOpacity = clamp01(
    fogW * 0.72 + (kind === 'fog' ? pulse * 0.22 : 0),
  );
  state.breezeOpacity = clamp01(
    kind === 'clear'
      ? pulse * 0.68 + state.sunshowerMix * 0.14
      : pulse * 0.28,
  );
}

export interface StepWeatherVisualParams {
  kind: WeatherKind;
  hasSunshower: boolean;
  atmosphere: ShiftAtmosphere;
  cityId?: string;
  dt: number;
  isPaused?: boolean;
}

/**
 * Advances weather blend weights and phase-shift transition envelope smoothly.
 * Freezing `dt` while paused keeps the frozen canvas state clean and stable.
 */
export function stepWeatherVisualState(
  state: WeatherVisualState,
  params: StepWeatherVisualParams,
): WeatherVisualState {
  const { kind, hasSunshower, atmosphere, cityId, dt, isPaused = false } = params;
  const base = computeAtmosphereBaseline(atmosphere);
  state.snowFlakeStyle = isSnowyAtmosphereCity(cityId) || kind === 'fog';

  if (isPaused || dt <= 0) {
    recomputeDerivedVisuals(state, base, kind);
    return state;
  }

  const clampedDt = Math.min(dt, 0.1);
  const blendK = 1 - Math.exp(-2.4 * clampedDt);

  const targetRain = kind === 'rain' ? 1 : 0;
  const targetFog = kind === 'fog' ? 1 : 0;
  const targetSunshower = hasSunshower ? 1 : 0;

  state.rainMix += (targetRain - state.rainMix) * blendK;
  state.fogMix += (targetFog - state.fogMix) * blendK;
  state.sunshowerMix += (targetSunshower - state.sunshowerMix) * blendK;

  if (state.rainMix < 0.001 && targetRain === 0) state.rainMix = 0;
  if (state.fogMix < 0.001 && targetFog === 0) state.fogMix = 0;
  if (state.sunshowerMix < 0.001 && targetSunshower === 0) {
    state.sunshowerMix = 0;
  }

  if (state.phaseBurstTimer > 0) {
    state.phaseBurstTimer = Math.max(0, state.phaseBurstTimer - clampedDt);
    const dur = Math.max(0.1, state.phaseBurstDuration);
    const progress = clamp01(1 - state.phaseBurstTimer / dur);
    // Swells rapidly to peak near 20% of the window, then trails off smoothly.
    state.phaseBurstAlpha = Math.sin(Math.PI * Math.pow(progress, 0.55));
  } else {
    state.phaseBurstAlpha = 0;
  }

  recomputeDerivedVisuals(state, base, kind);
  return state;
}
