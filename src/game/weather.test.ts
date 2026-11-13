import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getActiveWeather,
  getWeatherGripMult,
  nextWeatherBeat,
  setActiveWeather,
  weatherAt,
  weatherBeatsFor,
  WEATHER_GRIP,
  WEATHER_PROFILES,
} from './weather';

test('weather: every level starts clear so the opening shot is unchanged', () => {
  [1, 2, 3, 4, 5, 6].forEach((level) => {
    assert.equal(weatherAt(level, 0), 'clear');
    assert.equal(weatherAt(level, 12), 'clear');
  });
});

test('weather: beats fire exactly at their scheduled second and hold until the next', () => {
  const beats = weatherBeatsFor(1);
  const firstShift = beats[1];
  assert.equal(weatherAt(1, firstShift.atSec - 0.01), 'clear');
  assert.equal(weatherAt(1, firstShift.atSec), firstShift.kind);
  assert.equal(weatherAt(1, firstShift.atSec + 30), firstShift.kind);
});

test('weather: plans rotate across levels and every kind has a profile and grip', () => {
  assert.notDeepEqual(weatherBeatsFor(1), weatherBeatsFor(3));
  const kinds = new Set<string>();
  [1, 2, 3].forEach((level) => weatherBeatsFor(level).forEach((b) => kinds.add(b.kind)));
  kinds.forEach((kind) => {
    assert.ok(WEATHER_PROFILES[kind as keyof typeof WEATHER_PROFILES]);
    assert.ok(WEATHER_GRIP[kind as keyof typeof WEATHER_GRIP] > 0);
  });
  assert.ok(WEATHER_GRIP.rain < WEATHER_GRIP.clear);
});

test('weather: next beat previews the upcoming shift and ends up null at the tail', () => {
  assert.notEqual(nextWeatherBeat(1, 0), null);
  assert.equal(nextWeatherBeat(1, 9999), null);
});

test('weather: the active weather drives the physics grip multiplier', () => {
  setActiveWeather('clear');
  assert.equal(getWeatherGripMult(), 1);
  setActiveWeather('rain');
  assert.equal(getActiveWeather(), 'rain');
  assert.equal(getWeatherGripMult(), WEATHER_GRIP.rain);
  setActiveWeather('clear');
});
