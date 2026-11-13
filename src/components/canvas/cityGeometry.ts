import * as THREE from 'three';
import { TILE_SIZE } from '../../config/balance';
import { generateProceduralCity, gridToWorld } from '../../game/proceduralCity';
import { TileType } from '../../game/types';
import {
  createLandmarkMesh,
  landmarkKindForLevel,
  createPastelBuildingMesh,
  createProceduralTextures,
  createStreetPropMesh,
  createStreetSignMesh,
  createTreeMesh,
} from '../../game/meshes';
import { batchStaticDecor } from './staticBatcher';

type GeometryBag = Record<string, THREE.BufferGeometry>;
type MaterialBag = Record<string, THREE.Material>;
type TextureBag = ReturnType<typeof createProceduralTextures>;

export interface StaticCityGeometryDeps {
  levelGroup: THREE.Group;
  city: ReturnType<typeof generateProceduralCity>;
  textures: TextureBag;
  sharedGeos: GeometryBag;
  sharedMats: MaterialBag;
}

/**
 * Builds every immovable piece of a generated city: instanced tile layers (curbs,
 * grass caps, plaza caps, pavers, boulevards, bridges, brick walls, foam, zebra
 * stripes), boost pads, and the buildings / trees / street furniture / signs that
 * are merged by batchStaticDecor.
 *
 * Nothing here is animated per frame, so the whole layer is baked once per level
 * and handed back to the render loop as a handful of draw calls. Moving actors
 * (boats, pedestrians, hazards, the truck) stay in GameCanvas.
 *
 * Returns the static-prop batch statistics so callers can log draw-call savings.
 */
export function buildStaticCityGeometry({
  levelGroup,
  city: currentCity,
  textures,
  sharedGeos,
  sharedMats,
}: StaticCityGeometryDeps): ReturnType<typeof batchStaticDecor> {
  const _pos = new THREE.Vector3();
  const _quat = new THREE.Quaternion();
  const _euler = new THREE.Euler();
  const _scale = new THREE.Vector3();
  const _mat4 = new THREE.Matrix4();
  const _color = new THREE.Color();
  let staticDecor: THREE.Object3D[] = [];
  // Count tiles for InstancedMesh batching
  const islandCurbCoords: { x: number; z: number }[] = [];
  const grassCoords: { x: number; z: number; isMeadow: boolean }[] = [];
  const plazaCoords: { x: number; z: number }[] = [];
  const innerRoadCoords: { x: number; z: number }[] = [];
  const outerRoadCoords: { x: number; z: number }[] = [];
  const bridgeCoords: { x: number; z: number; rotatePlanks: boolean }[] = [];

  const N = currentCity.totalGridSize;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const t = currentCity.tiles[r][c];
      if (t === TileType.Water) continue;
      const wp = gridToWorld({ col: c, row: r }, N);
      if (t === TileType.InnerRoad) {
        innerRoadCoords.push(wp);
      } else if (t === TileType.OuterRoad) {
        outerRoadCoords.push(wp);
      } else if (t === TileType.Bridge) {
        const horizWater =
          currentCity.tiles[r]?.[c - 1] === TileType.Water ||
          currentCity.tiles[r]?.[c + 1] === TileType.Water;
        bridgeCoords.push({ ...wp, rotatePlanks: horizWater });
      } else if (t === TileType.Plaza || t === TileType.Courtyard) {
        islandCurbCoords.push(wp);
        plazaCoords.push(wp);
      } else {
        islandCurbCoords.push(wp);
        grassCoords.push({
          ...wp,
          isMeadow: t === TileType.OuterMeadow,
        });
      }
    }
  }

  // 1A. Instanced Cream Island Curbs under all land tiles
  if (islandCurbCoords.length > 0) {
    const curbInst = new THREE.InstancedMesh(
      sharedGeos.curbBlock,
      sharedMats.creamCurb,
      islandCurbCoords.length,
    );
    curbInst.receiveShadow = true;
    islandCurbCoords.forEach((g, idx) => {
      _pos.set(g.x, 0.0, g.z);
      _quat.identity();
      _scale.set(1, 1, 1);
      _mat4.compose(_pos, _quat, _scale);
      curbInst.setMatrixAt(idx, _mat4);
    });
    curbInst.instanceMatrix.needsUpdate = true;
    curbInst.computeBoundingSphere();
    levelGroup.add(curbInst);
  }

  // 1B. Instanced Lush Pastel Grass Caps
  if (grassCoords.length > 0) {
    const capInst = new THREE.InstancedMesh(
      sharedGeos.grassCap,
      sharedMats.grassLush,
      grassCoords.length,
    );
    capInst.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(grassCoords.length * 3),
      3,
    );
    capInst.receiveShadow = true;

    grassCoords.forEach((g, idx) => {
      _pos.set(g.x, 0.21, g.z);
      _quat.identity();
      _scale.set(1, 1, 1);
      _mat4.compose(_pos, _quat, _scale);
      capInst.setMatrixAt(idx, _mat4);

      _color.setHex(
        g.isMeadow ? 0xb4e875 : idx % 2 === 0 ? 0xa3de60 : 0xace36a,
      );
      capInst.setColorAt(idx, _color);
    });
    capInst.instanceMatrix.needsUpdate = true;
    if (capInst.instanceColor) capInst.instanceColor.needsUpdate = true;
    capInst.computeBoundingSphere();
    levelGroup.add(capInst);
  }

  // 1C. Instanced Warm Sandstone Plaza & Courtyard Caps
  if (plazaCoords.length > 0) {
    const plazaInst = new THREE.InstancedMesh(
      sharedGeos.grassCap,
      sharedMats.plazaSurface,
      plazaCoords.length,
    );
    plazaInst.receiveShadow = true;
    plazaCoords.forEach((p, idx) => {
      _pos.set(p.x, 0.21, p.z);
      _quat.identity();
      _scale.set(1, 1, 1);
      _mat4.compose(_pos, _quat, _scale);
      plazaInst.setMatrixAt(idx, _mat4);
    });
    plazaInst.instanceMatrix.needsUpdate = true;
    plazaInst.computeBoundingSphere();
    levelGroup.add(plazaInst);
  }

  // 2. Instanced Inner Modular Paver Roads
  if (innerRoadCoords.length > 0) {
    const innerInst = new THREE.InstancedMesh(
      sharedGeos.roadSlab,
      sharedMats.innerRoad,
      innerRoadCoords.length,
    );
    innerInst.receiveShadow = true;
    innerRoadCoords.forEach((p, idx) => {
      _pos.set(p.x, 0.01, p.z);
      _quat.identity();
      _scale.set(1, 1, 1);
      _mat4.compose(_pos, _quat, _scale);
      innerInst.setMatrixAt(idx, _mat4);
    });
    innerInst.instanceMatrix.needsUpdate = true;
    innerInst.computeBoundingSphere();
    levelGroup.add(innerInst);
  }

  // 3. Instanced Outer Asphalt Boulevard
  if (outerRoadCoords.length > 0) {
    const outerInst = new THREE.InstancedMesh(
      sharedGeos.roadSlab,
      sharedMats.outerRoad,
      outerRoadCoords.length,
    );
    outerInst.receiveShadow = true;
    outerRoadCoords.forEach((p, idx) => {
      _pos.set(p.x, 0.01, p.z);
      _quat.identity();
      _scale.set(1, 1, 1);
      _mat4.compose(_pos, _quat, _scale);
      outerInst.setMatrixAt(idx, _mat4);
    });
    outerInst.instanceMatrix.needsUpdate = true;
    outerInst.computeBoundingSphere();
    levelGroup.add(outerInst);
  }

  // 4. Instanced Wooden Canal Bridges + Terracotta Bridge Abutments
  if (bridgeCoords.length > 0) {
    const bridgeInst = new THREE.InstancedMesh(
      sharedGeos.bridgeDeck,
      sharedMats.woodBridge,
      bridgeCoords.length,
    );
    bridgeInst.receiveShadow = true;
    bridgeInst.castShadow = true;
    bridgeCoords.forEach((b, idx) => {
      _pos.set(b.x, 0.06, b.z);
      _euler.set(0, b.rotatePlanks ? 0 : Math.PI / 2, 0);
      _quat.setFromEuler(_euler);
      _scale.set(1, 1, 1);
      _mat4.compose(_pos, _quat, _scale);
      bridgeInst.setMatrixAt(idx, _mat4);
    });
    bridgeInst.instanceMatrix.needsUpdate = true;
    bridgeInst.computeBoundingSphere();
    levelGroup.add(bridgeInst);
  }

  // 5. Instanced Multi-Colored Courtyard Toy Brick Walls (3 alternating bricks per segment just like reference!)
  if (currentCity.brickWalls.length > 0) {
    const brickSubColors = [0xf8c94e, 0xdc7e44, 0x5ba85d, 0xf5dc93];
    const totalBricks = currentCity.brickWalls.length * 3;
    const brickInst = new THREE.InstancedMesh(
      sharedGeos.brickSeg,
      sharedMats.brickBase,
      totalBricks,
    );
    brickInst.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(totalBricks * 3),
      3,
    );
    brickInst.castShadow = true;
    brickInst.receiveShadow = true;
    currentCity.brickWalls.forEach((bw, idx) => {
      const cosY = Math.cos(bw.yaw);
      const sinY = Math.sin(bw.yaw);
      for (let sub = 0; sub < 3; sub++) {
        const along = (sub - 1) * (TILE_SIZE * 0.31);
        // Local X offset rotated by yaw
        const bx = bw.x + along * cosY;
        const bz = bw.z - along * sinY;
        const bHeightScale = sub === 1 ? 1.08 : 0.96;
        _pos.set(bx, 0.42, bz);
        _euler.set(0, bw.yaw, 0);
        _quat.setFromEuler(_euler);
        _scale.set(1, bHeightScale, 1);
        _mat4.compose(_pos, _quat, _scale);
        const flatIdx = idx * 3 + sub;
        brickInst.setMatrixAt(flatIdx, _mat4);
        _color.setHex(brickSubColors[(idx + sub) % brickSubColors.length]);
        brickInst.setColorAt(flatIdx, _color);
      }
    });
    brickInst.instanceMatrix.needsUpdate = true;
    if (brickInst.instanceColor) brickInst.instanceColor.needsUpdate = true;
    brickInst.computeBoundingSphere();
    levelGroup.add(brickInst);
  }

  // 6. Cute White Water Foam Clouds
  if (currentCity.waterClouds.length > 0) {
    const cloudInst = new THREE.InstancedMesh(
      sharedGeos.cloudPuff,
      sharedMats.cloudWhite,
      currentCity.waterClouds.length * 2,
    );
    currentCity.waterClouds.forEach((wc, idx) => {
      _pos.set(wc.x - 0.14, 0.02, wc.z);
      _quat.identity();
      _scale.set(1.1, 0.35, 0.9);
      _mat4.compose(_pos, _quat, _scale);
      cloudInst.setMatrixAt(idx * 2, _mat4);

      _pos.set(wc.x + 0.16, 0.02, wc.z + 0.08);
      _scale.set(0.85, 0.3, 0.75);
      _mat4.compose(_pos, _quat, _scale);
      cloudInst.setMatrixAt(idx * 2 + 1, _mat4);
    });
    cloudInst.instanceMatrix.needsUpdate = true;
    cloudInst.computeBoundingSphere();
    levelGroup.add(cloudInst);
  }

  // 7. Turbo Boost Pads on Straightaways
  for (const pad of currentCity.boostPads) {
    const pw = gridToWorld(pad.coord, N);
    const padGroup = new THREE.Group();
    padGroup.position.set(pw.x, 0.255, pw.z);
    padGroup.rotation.y = pad.yaw;
    for (const zOff of [-0.36, 0, 0.36]) {
      const chev = new THREE.Mesh(sharedGeos.chevronGeo, sharedMats.boostPadMat);
      chev.position.set(0, 0.02, zOff);
      chev.scale.set(1.2, 0.35, 0.9);
      padGroup.add(chev);
    }
    levelGroup.add(padGroup);
  }

  // 7B. Instanced Zebra Crosswalk Stripes at Intersections
  if (currentCity.crosswalks.length > 0) {
    const totalStripes = currentCity.crosswalks.length * 4;
    const cwInst = new THREE.InstancedMesh(
      sharedGeos.crosswalkStripe,
      sharedMats.crosswalkWhite,
      totalStripes,
    );
    currentCity.crosswalks.forEach((cw, idx) => {
      const cosY = Math.cos(cw.yaw);
      const sinY = Math.sin(cw.yaw);
      for (let s = 0; s < 4; s++) {
        const offset = (s - 1.5) * 0.44;
        _pos.set(cw.x + offset * cosY, 0.252, cw.z - offset * sinY);
        _euler.set(0, cw.yaw, 0);
        _quat.setFromEuler(_euler);
        _scale.set(1, 1, 1);
        _mat4.compose(_pos, _quat, _scale);
        cwInst.setMatrixAt(idx * 4 + s, _mat4);
      }
    });
    cwInst.instanceMatrix.needsUpdate = true;
    cwInst.computeBoundingSphere();
    levelGroup.add(cwInst);
  }

  const addStatic = (obj: THREE.Object3D) => {
    levelGroup.add(obj);
    staticDecor.push(obj);
  };

  // 8. Architectural Buildings, Lush Trees, Street Furniture & Canal Boats
  const landmarkSlots = new Map<number, ReturnType<typeof landmarkKindForLevel>>();
  if (currentCity.buildings.length >= 10) {
    const cx = currentCity.buildings.reduce((sum, b) => sum + b.coord.col, 0) / currentCity.buildings.length;
    const cz = currentCity.buildings.reduce((sum, b) => sum + b.coord.row, 0) / currentCity.buildings.length;
    const ranked = currentCity.buildings
      .map((b, i) => ({ i, score: Math.hypot(b.coord.col - cx, b.coord.row - cz) - b.floors * 0.4 }))
      .sort((a, b) => a.score - b.score);
    const wanted = currentCity.buildings.length >= 24 ? 2 : 1;
    for (let slot = 0; slot < Math.min(wanted, ranked.length); slot += 1) {
      landmarkSlots.set(ranked[slot].i, landmarkKindForLevel(currentCity.config.level ?? 1, slot));
    }
  }
  currentCity.buildings.forEach((lot, bIdx) => {
    const wp = gridToWorld(lot.coord, N);
    const landmarkKind = landmarkSlots.get(bIdx);
    addStatic(
      landmarkKind
        ? createLandmarkMesh(lot, wp, landmarkKind)
        : createPastelBuildingMesh(lot, wp, textures.clayBumpTex),
    );
  });
  for (const tree of currentCity.trees) {
    addStatic(createTreeMesh(tree, textures.shadowDiscTex));
  }
  for (const sp of currentCity.streetProps) {
    addStatic(createStreetPropMesh(sp, textures.shadowDiscTex));
  }
  for (const sign of currentCity.streetSigns ?? []) {
    addStatic(createStreetSignMesh(sign, textures.shadowDiscTex));
  }

  // 7Z. Collapse every static prop above into a handful of merged draw calls.
  const batchStats = batchStaticDecor(levelGroup, staticDecor);
  staticDecor = [];
  if (import.meta.env.DEV) console.info("[batch] " + JSON.stringify(batchStats));
  return batchStats;
}
