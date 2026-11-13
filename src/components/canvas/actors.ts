import * as THREE from 'three';
import { TILE_SIZE } from '../../config/balance';
import { gridToWorld } from '../../game/proceduralCity';
import type {
  CanalBoat,
  DuckCrossing,
  GreenWavePickup,
  SidewalkPedestrian,
  SkyBalloon,
} from '../../game/types';
import {
  CitizenStopRig,
  CoffeeKioskRig,
  HazardRig,
  IslandBirdRig,
  MechanicGarageRig,
  PersonRig,
  ProceduralTextures,
  RivalCourierRig,
  TrafficSignalRig,
  createCitizenStopRig,
  createCoffeeKioskMesh,
  createDetailedPersonMesh,
  createDuckCrossingMesh,
  createGreenWaveMesh,
  createHazardMesh,
  createIslandBirdMesh,
  createJumpRampMesh,
  createLandmarkBeaconMesh,
  createMechanicGarageMesh,
  createRivalCourierMesh,
  createSkyBalloonMesh,
  createTrafficSignalMesh,
} from '../../game/meshes';

/** A bird circling a landmark: orbit parameters are baked once at level build. */
export interface SpawnedIslandBird {
  rig: IslandBirdRig;
  centerX: number;
  centerZ: number;
  orbitRadiusX: number;
  orbitRadiusZ: number;
  baseY: number;
  speed: number;
  phase: number;
  flapSpeed: number;
}

/**
 * Mutable rig lists owned by the GameCanvas effect. The arrays are passed by
 * reference and cleared by disposeLevelGroup(), so actors can be appended here
 * without handing ownership of the collections over.
 */
export interface CityActorRigs {
  citizen: CitizenStopRig[];
  hazard: HazardRig[];
  signal: TrafficSignalRig[];
  kiosk: CoffeeKioskRig[];
  garage: MechanicGarageRig[];
  duck: { data: DuckCrossing; mesh: THREE.Group }[];
  greenWave: { data: GreenWavePickup; mesh: THREE.Group }[];
  balloon: { data: SkyBalloon; mesh: THREE.Group }[];
  pedestrian: { data: SidewalkPedestrian; rig: PersonRig }[];
  boat: { data: CanalBoat; mesh: THREE.Group }[];
  bird: SpawnedIslandBird[];
  rampBeacons: THREE.Group[];
  landmarkBeacons: { id: string; mesh: THREE.Group }[];
}

export interface CityActorDeps {
  levelGroup: THREE.Group;
  city: ReturnType<typeof import('../../game/proceduralCity').generateProceduralCity>;
  /** Grid size, also used for the bird orbit span. */
  N: number;
  textures: ProceduralTextures;
  maxAniso: number;
  rigs: CityActorRigs;
}

export interface CityActorResult {
  /** Rival courier van, present only on levels that spawn one. */
  rival: RivalCourierRig | null;
}

/**
 * Instantiates every per-level actor that is not static decor: pedestrians, waiting
 * customers, traffic hazards, signals, kiosks, balloons, garages, jump-ramp beacons,
 * duck crossings, green-wave pickups, the rival courier and the circling birds.
 *
 * These are the objects the render loop animates every frame, which is why they are
 * kept out of the merged static batch.
 */
export function buildCityActors({
  levelGroup,
  city: currentCity,
  N,
  textures,
  maxAniso,
  rigs,
}: CityActorDeps): CityActorResult {
  let rivalRig: RivalCourierRig | null = null;
  // 8B. Strolling Sidewalk & Plaza Pedestrians!
  for (const ped of currentCity.pedestrians) {
    const pRig = createDetailedPersonMesh(ped.appearance, textures.shadowDiscTex);
    pRig.root.position.set(ped.x, 0.42, ped.z);
    pRig.root.rotation.y = ped.yaw;
    levelGroup.add(pRig.root);
    rigs.pedestrian.push({ data: ped, rig: pRig });
  }

  // 9. Articulated Delivery Customers & Drop Pads
  for (const stop of currentCity.stops) {
    const cw = gridToWorld(stop.citizenCoord, N);
    const rw = gridToWorld(stop.roadCoord, N);
    const rig = createCitizenStopRig(
      stop,
      cw,
      rw,
      textures.shadowDiscTex,
      maxAniso,
    );
    levelGroup.add(rig.citizenGroup, rig.padGroup);
    rigs.citizen.push(rig);
  }

  // 10. Dynamic Traffic & Bridge Gate Hazards
  for (const h of currentCity.hazards) {
    const hRig = createHazardMesh(h, textures.shadowDiscTex);
    levelGroup.add(hRig.root);
    rigs.hazard.push(hRig);
  }

  // 11. 3D Intersection Traffic Signals, Drive-Thru Espresso Kiosks & Harbor Sky Balloons!
  for (const sig of currentCity.trafficSignals) {
    const sRig = createTrafficSignalMesh(sig);
    levelGroup.add(sRig.root);
    rigs.signal.push(sRig);
  }
  for (const kiosk of currentCity.coffeeKiosks) {
    const kRig = createCoffeeKioskMesh(kiosk, textures.shadowDiscTex);
    levelGroup.add(kRig.boothGroup, kRig.roadRingGroup);
    rigs.kiosk.push(kRig);
  }
  for (const bal of currentCity.skyBalloons) {
    const balMesh = createSkyBalloonMesh(bal);
    levelGroup.add(balMesh);
    rigs.balloon.push({ data: bal, mesh: balMesh });
  }

  // 12. Mechanic Garages, Canal Jump Ramps, Duckling Crossings, Green-Wave Orbs & Rival Courier!
  for (const gar of currentCity.mechanicGarages) {
    const gRig = createMechanicGarageMesh(gar, textures.shadowDiscTex);
    levelGroup.add(gRig.bayGroup, gRig.roadRingGroup);
    rigs.garage.push(gRig);
  }
  for (const ramp of currentCity.jumpRamps) {
    const rampGroup = createJumpRampMesh(ramp);
    rampGroup.children.forEach((ch) => {
      if (ch.userData?.isOverviewShortcut) {
        rigs.rampBeacons.push(ch as THREE.Group);
      }
    });
    levelGroup.add(rampGroup);
  }
  for (const duck of currentCity.duckCrossings) {
    const dMesh = createDuckCrossingMesh(duck);
    levelGroup.add(dMesh);
    rigs.duck.push({ data: duck, mesh: dMesh });
  }
  for (const gw of currentCity.greenWavePickups) {
    const gwMesh = createGreenWaveMesh(gw);
    levelGroup.add(gwMesh);
    rigs.greenWave.push({ data: gw, mesh: gwMesh });
  }
  if (currentCity.rivalCourier) {
    rivalRig = createRivalCourierMesh(
      currentCity.rivalCourier,
      textures.shadowDiscTex,
    );
    levelGroup.add(rivalRig.vanGroup, rivalRig.bonusDropGroup);
  }

  // 13. Flocking 3D Songbirds & Harbor Seagulls circling parks, trees, and canals!
  const birdPalettes: [number, number][] = [
    [0x70d6ff, 0x1d4ed8], // Sky bluebird
    [0xffe524, 0xf59e0b], // Sunny goldfinch
    [0xff8fab, 0xe11d48], // Coral blossom robin
    [0x9ef01a, 0x15803d], // Meadow parakeet
    [0xfefae0, 0x64748b], // Harbor seagull
  ];
  const islandHalfSpan = (currentCity.totalGridSize * TILE_SIZE) * 0.42;
  const birdCount = 9;
  for (let bi = 0; bi < birdCount; bi++) {
    const isHarborGull = bi >= 6;
    const [bodyHex, wingHex] = isHarborGull
      ? birdPalettes[4]
      : birdPalettes[bi % 4];
    const bRig = createIslandBirdMesh(bodyHex, wingHex);
    const anchorTree =
      !isHarborGull && currentCity.trees.length > 0
        ? currentCity.trees[(bi * 5) % currentCity.trees.length]
        : null;
    const angle = (bi / birdCount) * Math.PI * 2;
    const cx = anchorTree
      ? anchorTree.x
      : Math.cos(angle) * (islandHalfSpan * 0.85);
    const cz = anchorTree
      ? anchorTree.z
      : Math.sin(angle) * (islandHalfSpan * 0.85);
    levelGroup.add(bRig.root);
    rigs.bird.push({
      rig: bRig,
      centerX: cx,
      centerZ: cz,
      orbitRadiusX: isHarborGull ? 6.8 + (bi % 3) * 1.8 : 2.8 + (bi % 3) * 1.1,
      orbitRadiusZ: isHarborGull ? 5.2 + (bi % 2) * 1.6 : 2.3 + (bi % 2) * 0.9,
      baseY: isHarborGull ? 4.8 + (bi % 3) * 0.55 : 3.05 + (bi % 3) * 0.42,
      speed: isHarborGull ? 0.72 + (bi % 3) * 0.12 : 1.15 + (bi % 3) * 0.18,
      phase: bi * 1.37,
      flapSpeed: isHarborGull ? 9.5 : 14.5,
    });
  }


  // 14. Landmark Floating Discovery Beacons
  for (const lm of currentCity.landmarks ?? []) {
    const bMesh = createLandmarkBeaconMesh();
    bMesh.position.set(lm.x, 5.4, lm.z);
    levelGroup.add(bMesh);
    rigs.landmarkBeacons.push({ id: lm.id, mesh: bMesh });
  }

  return { rival: rivalRig };
}
