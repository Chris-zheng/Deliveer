import { findForwardRoadPath, gridToWorld, worldToGrid } from '../../game/proceduralCity';
import { getActiveStop } from '../../game/rules';
import type { GeneratedCity, TruckState } from '../../game/types';
import { wrapAngleRad } from '../../game/sim/geometry';

export interface RoadPathNode {
  x: number;
  z: number;
  yaw: number;
}

/**
 * Builds the forward-only turn-by-turn breadcrumb path from the van's current
 * grid cell to the active stop.
 *
 * Two rules keep the chevrons honest:
 *  - nodes behind the rear bumper are dropped, so no arrow ever points backward;
 *  - the first chevron's yaw is clamped to at most ~105 degrees off the van's
 *    heading, so it never reads as "turn around".
 */
export function computeForwardRoadPath(
  city: GeneratedCity,
  truck: TruckState,
  activeStop: ReturnType<typeof getActiveStop>,
): RoadPathNode[] {
  if (!activeStop) return [];

  const startGc = worldToGrid(truck.x, truck.z, city.totalGridSize);
  const rawPath = findForwardRoadPath(
    city.tiles,
    startGc,
    truck.yaw,
    activeStop.roadCoord,
  );
  const fwdX = Math.sin(truck.yaw);
  const fwdZ = Math.cos(truck.yaw);
  const path: RoadPathNode[] = [];

  for (let i = 0; i < rawPath.length; i++) {
    const wp = gridToWorld(rawPath[i], city.totalGridSize);
    const nextWp =
      i + 1 < rawPath.length
        ? gridToWorld(rawPath[i + 1], city.totalGridSize)
        : wp;
    const yaw =
      i + 1 < rawPath.length
        ? Math.atan2(nextWp.x - wp.x, nextWp.z - wp.z)
        : path.length > 0
          ? path[path.length - 1].yaw
          : truck.yaw;

    // Skip any node behind the van's rear bumper so no road arrow ever points backward!
    if (i > 0 && i < rawPath.length - 1) {
      const alongFwd = (wp.x - truck.x) * fwdX + (wp.z - truck.z) * fwdZ;
      if (alongFwd < -0.35) continue;
    }
    // Also ensure chevron yaw never points >105 backward relative to the van on the first step!
    const relStepYaw = wrapAngleRad(yaw - truck.yaw);
    const safeYaw =
      path.length <= 1 && Math.abs(relStepYaw) > Math.PI * 0.58
        ? wrapAngleRad(truck.yaw + Math.sign(relStepYaw || 1) * Math.PI * 0.5)
        : yaw;
    path.push({ x: wp.x, z: wp.z, yaw: safeYaw });
  }

  return path;
}
