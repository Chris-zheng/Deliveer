/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mid-run weather beats. The city already ships one static atmosphere per
 * level; this adds a predictable in-run shift so long runs do not read as one
 * flat 3D postcard. The plan is a pure function of the level number, so a run
 * is always reproducible and the HUD can warn the player ahead of time.
 */

export type WeatherKind = 'clear' | 'rain' | 'fog';

export interface WeatherBeat {
  atSec: number;
  kind: WeatherKind;
}

export interface WeatherProfile {
  labelZh: string;
  labelEn: string;
  hintZh: string;
  hintEn: string;
}

export const WEATHER_PROFILES: Record<WeatherKind, WeatherProfile> = {
  clear: {
    labelZh: '天气晴好',
    labelEn: 'Clear skies',
    hintZh: '抓地正常',
    hintEn: 'Full grip',
  },
  rain: {
    labelZh: '突降阵雨',
    labelEn: 'Sudden rain',
    hintZh: '路面湿滑 · 抓地 -16%',
    hintEn: 'Slick roads · -16% grip',
  },
  fog: {
    labelZh: '海雾来袭',
    labelEn: 'Sea fog',
    hintZh: '能见度骤降 · 抓地 -6%',
    hintEn: 'Low visibility · -6% grip',
  },
};

export const WEATHER_GRIP: Record<WeatherKind, number> = {
  clear: 1,
  rain: 0.84,
  fog: 0.94,
};

const WEATHER_PLANS: WeatherBeat[][] = [
  [
    { atSec: 0, kind: 'clear' },
    { atSec: 42, kind: 'rain' },
    { atSec: 92, kind: 'clear' },
  ],
  [
    { atSec: 0, kind: 'clear' },
    { atSec: 38, kind: 'fog' },
    { atSec: 88, kind: 'clear' },
  ],
  [
    { atSec: 0, kind: 'clear' },
    { atSec: 36, kind: 'rain' },
    { atSec: 78, kind: 'fog' },
  ],
];

export function weatherBeatsFor(level: number): WeatherBeat[] {
  const bucket = Math.abs(Math.trunc(level)) % WEATHER_PLANS.length;
  return WEATHER_PLANS[bucket];
}

export function weatherAt(level: number, elapsedSec: number): WeatherKind {
  const beats = weatherBeatsFor(level);
  let kind: WeatherKind = beats[0].kind;
  for (let i = 0; i < beats.length; i += 1) {
    if (elapsedSec >= beats[i].atSec) kind = beats[i].kind;
  }
  return kind;
}

export function nextWeatherBeat(level: number, elapsedSec: number): WeatherBeat | null {
  const beats = weatherBeatsFor(level);
  for (let i = 0; i < beats.length; i += 1) {
    if (beats[i].atSec > elapsedSec) return beats[i];
  }
  return null;
}

let activeWeather: WeatherKind = 'clear';

export function setActiveWeather(kind: WeatherKind): void {
  activeWeather = kind;
}

export function getActiveWeather(): WeatherKind {
  return activeWeather;
}

/** Grip multiplier the truck simulation folds into its wet-road handling. */
export function getWeatherGripMult(): number {
  return WEATHER_GRIP[activeWeather] || 1;
}
