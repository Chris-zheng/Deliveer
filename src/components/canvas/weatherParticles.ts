/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GPU-friendly atmospheric weather & Playing phase-shift particle system.
 * Uses pre-allocated typed arrays (zero per-frame allocations) for slanted rain
 * streaks (LineSegments) and procedural radial-sprite drifting snow/mist/breeze
 * droplets (Points), plus smooth sky/fog/light color interpolation.
 */

import * as THREE from 'three';
import { GamePhase, ShiftAtmosphere } from '../../game/types';
import {
  computeAtmosphereBaseline,
  stepWeatherVisualState,
  triggerPlayingPhaseTransition,
  WEATHER_VISUAL_OVERRIDES,
} from '../../game/weatherTransition';
import type { RuntimeState } from './runtimeState';

const RAIN_COUNT = 180;
const FLAKE_COUNT = 180;
const BOX_SPAN = 44;
const BOX_HALF = BOX_SPAN * 0.5;
const BOX_HEIGHT = 17;

// Pre-allocated scratch math (zero GC in per-frame tick)
const _baseSkyColor = new THREE.Color();
const _targetSkyColor = new THREE.Color();
const _rainSkyColor = new THREE.Color(WEATHER_VISUAL_OVERRIDES.rain.skyHex);
const _fogSkyColor = new THREE.Color(WEATHER_VISUAL_OVERRIDES.fog.skyHex);
const _cTop = new THREE.Color();
const _cAccent = new THREE.Color();

function createSoftParticleTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const half = size * 0.5;
    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.32, 'rgba(255, 255, 255, 0.86)');
    grad.addColorStop(0.7, 'rgba(235, 248, 255, 0.28)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function positiveMod(v: number, span: number): number {
  const m = v % span;
  return m < 0 ? m + span : m;
}

export interface WeatherParticleSystemOptions {
  scene: THREE.Scene;
  sunLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
}

export interface WeatherParticleSystem {
  triggerPlayingTransition: (S: RuntimeState, durationSec?: number) => void;
  update: (
    dt: number,
    S: RuntimeState,
    currentPhase: GamePhase,
    focusTarget: THREE.Vector3,
  ) => void;
  dispose: () => void;
}

export function createWeatherParticleSystem({
  scene,
  sunLight,
  hemiLight,
}: WeatherParticleSystemOptions): WeatherParticleSystem {
  const flakeTex = createSoftParticleTexture();

  // ---- 1. Diagonal Rain Streaks (THREE.LineSegments) ----
  const rainPositions = new Float32Array(RAIN_COUNT * 2 * 3);
  const rainSeeds = new Float32Array(RAIN_COUNT * 5); // lx, ly, lz, speed, len
  for (let i = 0; i < RAIN_COUNT; i++) {
    const sIdx = i * 5;
    rainSeeds[sIdx] = (Math.random() - 0.5) * BOX_SPAN;
    rainSeeds[sIdx + 1] = 0.4 + Math.random() * BOX_HEIGHT;
    rainSeeds[sIdx + 2] = (Math.random() - 0.5) * BOX_SPAN;
    rainSeeds[sIdx + 3] = 20 + Math.random() * 7;
    rainSeeds[sIdx + 4] = 0.85 + Math.random() * 0.65;
  }

  const rainGeo = new THREE.BufferGeometry();
  const rainPosAttr = new THREE.BufferAttribute(rainPositions, 3);
  rainPosAttr.setUsage(THREE.DynamicDrawUsage);
  rainGeo.setAttribute('position', rainPosAttr);

  const rainMat = new THREE.LineBasicMaterial({
    color: 0xdbeeff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  });
  const rainLines = new THREE.LineSegments(rainGeo, rainMat);
  rainLines.frustumCulled = false;
  rainLines.visible = false;
  rainLines.renderOrder = 8;
  scene.add(rainLines);

  // ---- 2. Drifting Snow / Mist / Sunlit Transition Motes (THREE.Points) ----
  const flakePositions = new Float32Array(FLAKE_COUNT * 3);
  const flakeColors = new Float32Array(FLAKE_COUNT * 3);
  const flakeSeeds = new Float32Array(FLAKE_COUNT * 5); // lx, ly, lz, fallSpeed, phase
  for (let i = 0; i < FLAKE_COUNT; i++) {
    const sIdx = i * 5;
    flakeSeeds[sIdx] = (Math.random() - 0.5) * BOX_SPAN;
    flakeSeeds[sIdx + 1] = 0.4 + Math.random() * BOX_HEIGHT;
    flakeSeeds[sIdx + 2] = (Math.random() - 0.5) * BOX_SPAN;
    flakeSeeds[sIdx + 3] = 2.0 + Math.random() * 2.2;
    flakeSeeds[sIdx + 4] = Math.random() * Math.PI * 2;
    const cIdx = i * 3;
    flakeColors[cIdx] = 1;
    flakeColors[cIdx + 1] = 1;
    flakeColors[cIdx + 2] = 1;
  }

  const flakeGeo = new THREE.BufferGeometry();
  const flakePosAttr = new THREE.BufferAttribute(flakePositions, 3);
  flakePosAttr.setUsage(THREE.DynamicDrawUsage);
  const flakeColorAttr = new THREE.BufferAttribute(flakeColors, 3);
  flakeColorAttr.setUsage(THREE.DynamicDrawUsage);
  flakeGeo.setAttribute('position', flakePosAttr);
  flakeGeo.setAttribute('color', flakeColorAttr);

  const flakeMat = new THREE.PointsMaterial({
    size: 0.44,
    map: flakeTex,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    sizeAttenuation: true,
    fog: false,
  });
  const flakePoints = new THREE.Points(flakeGeo, flakeMat);
  flakePoints.frustumCulled = false;
  flakePoints.visible = false;
  flakePoints.renderOrder = 9;
  scene.add(flakePoints);

  function triggerPlayingTransition(S: RuntimeState, durationSec: number = 2.4) {
    triggerPlayingPhaseTransition(S.weatherVisual, durationSec);
  }

  function update(
    dt: number,
    S: RuntimeState,
    currentPhase: GamePhase,
    focusTarget: THREE.Vector3,
  ) {
    const isPaused = currentPhase === GamePhase.Paused;
    const atmosphere = S.currentCity
      ? S.currentCity.config.atmosphere
      : ShiftAtmosphere.SunnyHarbor;
    const hasSunshower = Boolean(S.currentCity?.config.hasSunshower);
    const cityId = S.currentCity?.config.customCity?.worldCityId;

    const wv = stepWeatherVisualState(S.weatherVisual, {
      kind: S.weatherKind,
      hasSunshower,
      atmosphere,
      cityId,
      dt,
      isPaused,
    });

    // Smoothly interpolate scene sky, fog tint, and sun/hemi fill intensities
    const baseAtm = computeAtmosphereBaseline(atmosphere);
    _baseSkyColor.setHex(baseAtm.skyHex);
    _targetSkyColor.copy(_baseSkyColor);
    if (wv.rainMix > 0.001) {
      _targetSkyColor.lerp(_rainSkyColor, wv.rainMix);
    }
    if (wv.fogMix > 0.001) {
      _targetSkyColor.lerp(_fogSkyColor, wv.fogMix);
    }

    if (scene.background instanceof THREE.Color) {
      scene.background.copy(_targetSkyColor);
    }
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(_targetSkyColor);
    }
    sunLight.intensity = wv.sunIntensity;
    hemiLight.intensity = wv.hemiIntensity;

    const motionDt = isPaused ? 0 : Math.min(dt, 0.05);
    const fx = focusTarget.x;
    const fz = focusTarget.z;

    // ---- Rain Streaks Update ----
    if (wv.rainOpacity > 0.01) {
      rainLines.visible = true;
      rainMat.opacity = wv.rainOpacity;
      const windX = -3.4 - wv.phaseBurstAlpha * 2.2;
      const windZ = 1.6;
      const lenScale = 0.72 + wv.rainMix * 0.45 + wv.phaseBurstAlpha * 0.35;

      for (let i = 0; i < RAIN_COUNT; i++) {
        const sIdx = i * 5;
        let lx = rainSeeds[sIdx] + windX * motionDt;
        let ly = rainSeeds[sIdx + 1] - rainSeeds[sIdx + 3] * motionDt;
        let lz = rainSeeds[sIdx + 2] + windZ * motionDt;

        if (ly < 0.25) {
          ly += BOX_HEIGHT;
        }
        rainSeeds[sIdx] = lx;
        rainSeeds[sIdx + 1] = ly;
        rainSeeds[sIdx + 2] = lz;

        const wx = fx - BOX_HALF + positiveMod(lx - fx + BOX_HALF, BOX_SPAN);
        const wz = fz - BOX_HALF + positiveMod(lz - fz + BOX_HALF, BOX_SPAN);
        const streakLen = rainSeeds[sIdx + 4] * lenScale;

        const pIdx = i * 6;
        rainPositions[pIdx] = wx;
        rainPositions[pIdx + 1] = ly;
        rainPositions[pIdx + 2] = wz;
        rainPositions[pIdx + 3] = wx - 0.14 * streakLen;
        rainPositions[pIdx + 4] = ly - streakLen;
        rainPositions[pIdx + 5] = wz + 0.07 * streakLen;
      }
      rainPosAttr.needsUpdate = true;
    } else {
      rainLines.visible = false;
    }

    // ---- Flakes / Mist / Playing Phase-Shift Motes Update ----
    const pointOpacity = Math.min(
      0.88,
      Math.max(wv.flakeOpacity, wv.breezeOpacity, wv.rainOpacity * 0.36),
    );

    if (pointOpacity > 0.01) {
      flakePoints.visible = true;
      flakeMat.opacity = pointOpacity;

      const isSnowFog = wv.flakeOpacity >= wv.breezeOpacity && wv.flakeOpacity > 0.08;
      const isRainSpray =
        !isSnowFog && wv.rainOpacity > wv.breezeOpacity && wv.rainOpacity > 0.08;

      if (isSnowFog) {
        flakeMat.size = wv.snowFlakeStyle ? 0.54 : 0.46;
        _cTop.setHex(0xffffff);
        _cAccent.setHex(0xdbeafe);
      } else if (isRainSpray) {
        flakeMat.size = 0.28;
        _cTop.setHex(0xe0f2fe);
        _cAccent.setHex(0x93c5fd);
      } else {
        // Playing phase-shift breeze motes matching current shift atmosphere
        flakeMat.size = 0.4 + wv.phaseBurstAlpha * 0.14;
        if (atmosphere === ShiftAtmosphere.GoldenSunset) {
          _cTop.setHex(0xfef08a);
          _cAccent.setHex(0xfdba74);
        } else if (atmosphere === ShiftAtmosphere.TwilightNeon) {
          _cTop.setHex(0xa5f3fc);
          _cAccent.setHex(0xf5d0fe);
        } else {
          _cTop.setHex(0xffffff);
          _cAccent.setHex(0xfef9c3);
        }
      }

      const fallMult = isRainSpray ? 3.2 : isSnowFog ? 1.0 : 0.62;
      const swayMult = isRainSpray ? 0.4 : isSnowFog ? 1.35 : 1.75;
      const windDriftX = isSnowFog
        ? -0.85
        : isRainSpray
          ? -2.2
          : -2.4 - wv.phaseBurstAlpha * 2.8;
      const clock = S.visualClock;

      for (let i = 0; i < FLAKE_COUNT; i++) {
        const sIdx = i * 5;
        const ph = flakeSeeds[sIdx + 4];
        const swayX = Math.sin(clock * 1.45 + ph) * swayMult * motionDt;
        const swayZ = Math.cos(clock * 1.15 + ph * 1.3) * swayMult * 0.7 * motionDt;

        let lx = flakeSeeds[sIdx] + windDriftX * motionDt + swayX;
        let ly = flakeSeeds[sIdx + 1] - flakeSeeds[sIdx + 3] * fallMult * motionDt;
        let lz = flakeSeeds[sIdx + 2] + swayZ;

        if (ly < 0.28) {
          ly += BOX_HEIGHT;
        }
        flakeSeeds[sIdx] = lx;
        flakeSeeds[sIdx + 1] = ly;
        flakeSeeds[sIdx + 2] = lz;

        const wx = fx - BOX_HALF + positiveMod(lx - fx + BOX_HALF, BOX_SPAN);
        const wz = fz - BOX_HALF + positiveMod(lz - fz + BOX_HALF, BOX_SPAN);

        const pIdx = i * 3;
        flakePositions[pIdx] = wx;
        flakePositions[pIdx + 1] = ly;
        flakePositions[pIdx + 2] = wz;

        const col = (i & 1) === 0 ? _cTop : _cAccent;
        flakeColors[pIdx] = col.r;
        flakeColors[pIdx + 1] = col.g;
        flakeColors[pIdx + 2] = col.b;
      }

      flakePosAttr.needsUpdate = true;
      flakeColorAttr.needsUpdate = true;
    } else {
      flakePoints.visible = false;
    }
  }

  function dispose() {
    scene.remove(rainLines);
    scene.remove(flakePoints);
    rainGeo.dispose();
    rainMat.dispose();
    flakeGeo.dispose();
    flakeMat.dispose();
    flakeTex.dispose();
  }

  return {
    triggerPlayingTransition,
    update,
    dispose,
  };
}
