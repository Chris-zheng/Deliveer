import type * as THREE from 'three';
import { stepHazardsAndCollisions, stepPedestriansPhysics, stepTrafficSignals } from '../../game/rules';
import { GamePhase } from '../../game/types';
import { CHASE_BACK_DIST, CHASE_LOOK_AHEAD, CHASE_UP_HEIGHT, wrapAngleRad } from './canvasMath';
import type { RuntimeState } from './runtimeState';

export interface TitleStepDeps {
  camera: THREE.PerspectiveCamera;
  camLookTarget: THREE.Vector3;
  waterPlane: THREE.Mesh;
}

/** Drives the live heading-up world preview that runs behind the parked van on the title screen. */
export function stepTitlePreview(dt: number, S: RuntimeState, deps: TitleStepDeps): void {
  const { camera, camLookTarget, waterPlane } = deps;
    // Live World Heading-Up Preview behind the parked Courier Van!
    stepTrafficSignals(S.currentCity.trafficSignals, dt * 0.85);
    stepHazardsAndCollisions(
      S.currentCity.hazards,
      S.truckState,
      dt * 0.65,
      S.currentCity.trafficSignals,
      S.currentCity,
    );
    stepPedestriansPhysics(
      S.currentCity.pedestrians,
      S.currentCity,
      S.truckState,
      dt * 0.85,
    );
    const titleYaw = S.truckState.yaw + Math.sin(S.visualClock * 0.35) * 0.14;
    const dampAlpha = 1 - Math.exp(-3.5 * dt);
    S.camYaw = wrapAngleRad(S.camYaw + wrapAngleRad(titleYaw - S.camYaw) * dampAlpha);
    const leadX = S.truckState.x + Math.sin(S.camYaw) * CHASE_LOOK_AHEAD;
    const leadZ = S.truckState.z + Math.cos(S.camYaw) * CHASE_LOOK_AHEAD;
    camLookTarget.x += (leadX - camLookTarget.x) * dampAlpha;
    camLookTarget.y += (0.35 - camLookTarget.y) * dampAlpha;
    camLookTarget.z += (leadZ - camLookTarget.z) * dampAlpha;
    camera.position.set(
      camLookTarget.x - Math.sin(S.camYaw) * CHASE_BACK_DIST,
      camLookTarget.y + CHASE_UP_HEIGHT,
      camLookTarget.z - Math.cos(S.camYaw) * CHASE_BACK_DIST,
    );
    camera.lookAt(camLookTarget);
    waterPlane.position.set(camLookTarget.x, 0.0, camLookTarget.z);
}

