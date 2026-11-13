import * as THREE from 'three';
import { CAMERA } from '../../config/balance';

// Shared zero-GC scratch objects and chase-camera constants used by the per-frame
// simulation (canvas/runtime.ts) and the visual layer (canvas/visuals.ts).
// Pre-allocated scratch math helpers (Zero GC in per-frame tick!)
export const _mat4 = new THREE.Matrix4();
export const _pos = new THREE.Vector3();
export const _quat = new THREE.Quaternion();
export const _euler = new THREE.Euler();
export const _scale = new THREE.Vector3();
export const _color = new THREE.Color();
export const _ndc = new THREE.Vector2();
export const _raycaster = new THREE.Raycaster();
export const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.24);
export const _intersectPt = new THREE.Vector3();


// Elevated Top-Down "Heading-Up" Google Maps 3D Chase Camera Constants
export const CHASE_BASE_FOV = CAMERA.baseFov;
export const CHASE_LOOK_AHEAD = CAMERA.lookAhead;
export const CHASE_BACK_DIST = CAMERA.backDist;
export const CHASE_UP_HEIGHT = CAMERA.upHeight;

export function wrapAngleRad(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
