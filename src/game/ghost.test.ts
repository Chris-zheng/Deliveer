/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeGhostSample,
  isGhostSample,
  loadGhost,
  sampleGhostAt,
  saveGhost,
} from './ghost';
import { getGhostKey, setRunMode } from './runMode';

test('ghost samples round to a compact payload', () => {
  const sample = encodeGhostSample(12.3456789, -3.14159, 88.8888, 1.2345678);
  assert.deepEqual(sample, [12.35, -3.14, 88.89, 1.235]);
  assert.equal(isGhostSample(sample), true);
  assert.equal(isGhostSample([1, 2, 3]), false);
  assert.equal(isGhostSample([1, 2, 3, Number.NaN]), false);
});

test('the ghost path interpolates and clamps at both ends', () => {
  const path: Array<[number, number, number, number]> = [
    [0, 0, 0, 0],
    [2, 10, 20, 1],
    [4, 20, 40, 2],
  ];
  assert.deepEqual(sampleGhostAt(path, -5), path[0]);
  assert.deepEqual(sampleGhostAt(path, 0), path[0]);
  assert.deepEqual(sampleGhostAt(path, 3), [3, 15, 30, 1.5]);
  assert.deepEqual(sampleGhostAt(path, 99), path[2]);
  assert.equal(sampleGhostAt([], 1), null);
});

test('a ghost needs two samples and never overwrites a better run', () => {
  const key = 'unit-test-ghost';
  assert.equal(saveGhost(key, 500, [[0, 0, 0, 0]]), false);
  assert.equal(saveGhost(key, 500, [[0, 0, 0, 0], [1, 1, 1, 0]]), true);
  assert.equal(saveGhost(key, 400, [[0, 0, 0, 0], [1, 2, 2, 0]]), false);
  assert.equal(loadGhost('never-written-key'), null);
});

test('the ghost key follows the run mode', () => {
  setRunMode({ kind: 'free', level: 7 });
  assert.equal(getGhostKey(7), 'level:7');
  setRunMode({ kind: 'daily', level: 3, seed: 42, dateKey: '2026-01-12' });
  assert.equal(getGhostKey(3), 'daily:2026-01-12');
  setRunMode({ kind: 'free', level: 1 });
});
