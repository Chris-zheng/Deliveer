import type { GeneratedCity } from '../../game/types';

export interface MinimapSnapshot {
  city: GeneratedCity | null;
  truckX: number;
  truckZ: number;
  truckYaw: number;
  activeStopIndex: number;
}
