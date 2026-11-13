import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BuildingTheme, type BuildingLot } from './types';
import { createLandmarkMesh, landmarkKindForLevel, type LandmarkKind } from './meshes';

const KINDS: LandmarkKind[] = [
  'clock-tower',
  'radio-mast',
  'grand-arch',
  'pearl-tower',
  'palace-gate',
  'colosseum-ring',
  'pyramid',
  'sail-opera',
  'liberty-spire',
  'windmill-gable',
];

function makeLot(): BuildingLot {
  return {
    coord: { col: 3, row: 4 },
    theme: BuildingTheme.ClockTowerHall,
    floors: 2,
    facingYaw: 0,
    hasAwning: true,
    hasBalconies: false,
    roofFeature: 'clock',
  };
}

test('landmarks: every kind builds a real, tall structure', () => {
  for (const kind of KINDS) {
    const group = createLandmarkMesh(makeLot(), { x: 1.5, z: -2.5 }, kind);
    assert.ok(group.children.length >= 4, `${kind} should have several parts`);
    const box = new THREE.Box3().setFromObject(group);
    const height = box.max.y - box.min.y;
    assert.ok(height > 3.4, `${kind} should stand taller than a normal block (got ${height.toFixed(2)})`);
    assert.ok(box.min.y < 0.6 && box.max.y > 3.4, `${kind} should rise from the podium`);
  }
});

test('landmarks: kinds rotate deterministically per level', () => {
  const first = landmarkKindForLevel(1, 0);
  assert.equal(landmarkKindForLevel(1, 0), first);
  assert.notEqual(landmarkKindForLevel(2, 0), first);
  assert.equal(landmarkKindForLevel(4, 0), first);
  const secondSlot = landmarkKindForLevel(1, 1);
  assert.notEqual(secondSlot, first);
});
