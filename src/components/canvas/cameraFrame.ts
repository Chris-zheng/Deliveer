import * as THREE from 'three';
import { TILE_SIZE } from '../../config/balance';
import { OutcomeKind, ShiftAtmosphere } from '../../game/types';
import { VIEW_FRAMING, getViewMode } from '../../game/controls';
import type { RuntimeState } from './runtimeState';
import {
  CHASE_BACK_DIST,
  CHASE_BASE_FOV,
  CHASE_LOOK_AHEAD,
  CHASE_UP_HEIGHT,
  wrapAngleRad,
} from './canvasMath';

// Framing blend so switching view mode never snaps the camera.
const viewBlend = { back: 1, up: 1, lookAhead: 1, fov: 1 };

function stepViewBlend(dt: number): void {
  const target = VIEW_FRAMING[getViewMode()];
  const k = 1 - Math.exp(-6.5 * Math.max(dt, 0.001));
  viewBlend.back += (target.back - viewBlend.back) * k;
  viewBlend.up += (target.up - viewBlend.up) * k;
  viewBlend.lookAhead += (target.lookAhead - viewBlend.lookAhead) * k;
  viewBlend.fov += (target.fov - viewBlend.fov) * k;
}

// Scene handles the camera framing pass needs beyond RuntimeState.
export interface CameraFramingDeps {
  camera: THREE.PerspectiveCamera;
  camLookTarget: THREE.Vector3;
  scene: THREE.Scene;
  waterPlane: THREE.Mesh;
  sunLight: THREE.DirectionalLight;
}

// Bird-Eye 3-2-1 island swoop / demo drone zoom -> heading-up chase -> victory orbit,
// plus the water plane and sun target that must follow the camera look target.
export function updateCameraFraming(dt: number, S: RuntimeState, deps: CameraFramingDeps): void {
  const { camera, camLookTarget, scene, waterPlane, sunLight } = deps;
        // Camera Framing: Bird's-Eye 3-2-1 Island Swoop / Demo Drone Zoom -> Heading-Up Chase -> Victory Orbit!
        // The player-selected view mode (chase / far / top) is blended in on top.
        stepViewBlend(dt);
        const isPortraitMobile = camera.aspect < 0.95;
        const zoomScale = S.demoState.active ? S.demoState.cameraZoomScale : 1;
        const yawOffset = S.demoState.active ? S.demoState.cameraYawOffset : 0;
        const activeLookAhead =
          (isPortraitMobile ? 6.1 : CHASE_LOOK_AHEAD) *
          viewBlend.lookAhead *
          (S.demoState.active ? 0.8 + 0.2 * zoomScale : 1);
        const activeBackDist =
          (isPortraitMobile ? CHASE_BACK_DIST * 1.07 : CHASE_BACK_DIST) *
          viewBlend.back *
          zoomScale;
        const activeUpHeight =
          (isPortraitMobile ? CHASE_UP_HEIGHT * 1.07 : CHASE_UP_HEIGHT) *
          viewBlend.up *
          zoomScale;
        const baseFov = isPortraitMobile ? 42 : CHASE_BASE_FOV;
        const targetFov = baseFov * viewBlend.fov;
        if (Math.abs(camera.fov - targetFov) > 0.01) {
          camera.fov = targetFov;
          camera.updateProjectionMatrix();
        }
        const targetLookY = isPortraitMobile ? -0.45 : 0.35;

        const demoZoomOut = S.demoState.active ? S.demoState.transitionZoomAlpha : 0;
        const swoopA = Math.min(S.countdownState.swoopAlpha, 1 - demoZoomOut);
        // Keep fog pushed back during high Bird's-Eye overview so the entire miniature island sparkles crisply!
        if (scene.fog instanceof THREE.Fog) {
          const baseFogNear =
            S.currentCity.config.atmosphere === ShiftAtmosphere.TwilightNeon
              ? 54
              : 58;
          const baseFogFar =
            S.currentCity.config.atmosphere === ShiftAtmosphere.TwilightNeon
              ? 122
              : 128;
          const ovwFactor = 1 - swoopA;
          scene.fog.near = baseFogNear + ovwFactor * 98;
          scene.fog.far = baseFogFar + ovwFactor * 165;
        }

        if (swoopA < 0.999) {
          // Cinematic Bird's-Eye Island Overview diving smoothly to/from street or Victory Orbit!
          const inVictory =
            S.finishDelayTimer >= 0 && S.pendingOutcome === OutcomeKind.Victory;
          S.camYaw = wrapAngleRad(S.truckState.yaw + yawOffset);
          let chaseLeadX = S.truckState.x + Math.sin(S.camYaw) * activeLookAhead;
          let chaseLeadY = targetLookY;
          let chaseLeadZ = S.truckState.z + Math.cos(S.camYaw) * activeLookAhead;
          let chaseCamX = chaseLeadX - Math.sin(S.camYaw) * activeBackDist;
          let chaseCamY = targetLookY + activeUpHeight;
          let chaseCamZ = chaseLeadZ - Math.cos(S.camYaw) * activeBackDist;

          if (inVictory) {
            const orbitYaw = S.camYaw + S.victoryOrbitAngle;
            const orbitLerp = Math.min(1, S.victoryOrbitAngle / 0.8);
            const vicDist = activeBackDist * (1 - 0.24 * orbitLerp);
            const vicHeight = activeUpHeight * (1 - 0.28 * orbitLerp);
            chaseLeadX = S.truckState.x;
            chaseLeadY = 0.55;
            chaseLeadZ = S.truckState.z;
            chaseCamX = chaseLeadX - Math.sin(orbitYaw) * vicDist;
            chaseCamY = chaseLeadY + vicHeight;
            chaseCamZ = chaseLeadZ - Math.cos(orbitYaw) * vicDist;
          }

          const islandSpan = S.currentCity.totalGridSize * TILE_SIZE;
          const ovwYaw = S.demoState.active
            ? Math.PI / 2 - 0.34 + S.demoState.elapsedSec * 0.04
            : S.truckState.yaw - 0.34 * (1 - swoopA);
          const ovwHeight = islandSpan * (isPortraitMobile ? 1.56 : 1.44);
          const ovwBack = islandSpan * (isPortraitMobile ? 1.04 : 0.94);
          const ovwCamX = -Math.sin(ovwYaw) * ovwBack;
          const ovwCamY = ovwHeight;
          const ovwCamZ = -Math.cos(ovwYaw) * ovwBack;

          const arcLift = Math.sin(swoopA * Math.PI) * 4.5;

          camLookTarget.set(
            chaseLeadX * swoopA,
            0.4 * (1 - swoopA) + chaseLeadY * swoopA,
            chaseLeadZ * swoopA,
          );
          camera.position.set(
            ovwCamX + (chaseCamX - ovwCamX) * swoopA,
            ovwCamY + (chaseCamY - ovwCamY) * swoopA + arcLift,
            ovwCamZ + (chaseCamZ - ovwCamZ) * swoopA,
          );
          camera.lookAt(camLookTarget);
        } else if (
          S.finishDelayTimer >= 0 &&
          S.pendingOutcome === OutcomeKind.Victory
        ) {
          // Celebratory Stage-Clear 3D Victory Orbit around the Courier Van!
          const orbitYaw = S.camYaw + S.victoryOrbitAngle;
          const orbitLerp = Math.min(1, S.victoryOrbitAngle / 0.8);
          const vicDist = activeBackDist * (1 - 0.24 * orbitLerp);
          const vicHeight = activeUpHeight * (1 - 0.28 * orbitLerp);
          const followDamp = 1 - Math.exp(-8.0 * dt);
          camLookTarget.x += (S.truckState.x - camLookTarget.x) * followDamp;
          camLookTarget.y += (0.55 - camLookTarget.y) * followDamp;
          camLookTarget.z += (S.truckState.z - camLookTarget.z) * followDamp;
          camera.position.set(
            camLookTarget.x - Math.sin(orbitYaw) * vicDist,
            camLookTarget.y + vicHeight,
            camLookTarget.z - Math.cos(orbitYaw) * vicDist,
          );
          camera.lookAt(camLookTarget);
        } else {
          const desiredCamYaw = wrapAngleRad(S.truckState.yaw + yawOffset);
          const yawDamp = 1 - Math.exp(-7.5 * dt);
          S.camYaw = wrapAngleRad(
            S.camYaw + wrapAngleRad(desiredCamYaw - S.camYaw) * yawDamp,
          );

          const followDamp = 1 - Math.exp(-9.5 * dt);
          const leadX = S.truckState.x + Math.sin(S.camYaw) * activeLookAhead;
          const leadZ = S.truckState.z + Math.cos(S.camYaw) * activeLookAhead;
          camLookTarget.x += (leadX - camLookTarget.x) * followDamp;
          camLookTarget.y += (targetLookY - camLookTarget.y) * followDamp;
          camLookTarget.z += (leadZ - camLookTarget.z) * followDamp;

          const rightX = -Math.cos(S.camYaw);
          const rightZ = Math.sin(S.camYaw);
          const shakeAmt = S.cameraTrauma * S.cameraTrauma * 0.45;
          const shakeLat =
            shakeAmt > 0.001 ? Math.sin(S.visualClock * 53) * shakeAmt : 0;
          const shakeFwd =
            shakeAmt > 0.001 ? Math.cos(S.visualClock * 47) * shakeAmt : 0;

          camera.position.set(
            camLookTarget.x -
              Math.sin(S.camYaw) * activeBackDist +
              rightX * shakeLat +
              Math.sin(S.camYaw) * shakeFwd,
            camLookTarget.y + activeUpHeight,
            camLookTarget.z -
              Math.cos(S.camYaw) * activeBackDist +
              rightZ * shakeLat +
              Math.cos(S.camYaw) * shakeFwd,
          );
          camera.lookAt(camLookTarget);
        }

        waterPlane.position.set(camLookTarget.x, 0.0, camLookTarget.z);
        sunLight.position.set(camLookTarget.x + 18, 32, camLookTarget.z + 14);
        sunLight.target.position.copy(camLookTarget);
}
