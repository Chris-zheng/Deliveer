import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CAMERA } from '../../config/balance';
import {
  ToyTruckRig,
  WindStreakRig,
  createBeveledBlockGeometry,
  createProceduralTextures,
  createToyTruckMesh,
  createWindStreakMesh,
} from '../../game/meshes';
import { TILE_SIZE, TopperId, VehicleId } from '../../game/types';

const CHASE_BASE_FOV = CAMERA.baseFov;
const CHASE_BACK_DIST = CAMERA.backDist;
const CHASE_UP_HEIGHT = CAMERA.upHeight;

export interface SceneStageDeps {
  container: HTMLDivElement;
  vehicle: VehicleId;
  topper: TopperId;
}

/**
 * Builds the immutable parts of the 3D world: renderer, scene, camera, the
 * three-point daylight rig, the endless canal water plane, the shared procedural
 * textures/tile geometries, and the persistent hero truck rig with its
 * near-miss wind-streak ribbons.
 *
 * Nothing here is rebuilt per level; the caller owns teardown.
 */
export function createSceneStage({ container, vehicle, topper }: SceneStageDeps) {
// 1. Software WebGL Detection (per threejs & ultra-mode directives)
const isSoftwareGl = (() => {
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
})();

const renderer = new THREE.WebGLRenderer({
  antialias: !isSoftwareGl,
  powerPreference: 'high-performance',
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.96;
renderer.setPixelRatio(
  isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
);
renderer.shadowMap.enabled = !isSoftwareGl;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const initRect = container.getBoundingClientRect();
const initW = Math.max(320, initRect.width || window.innerWidth);
const initH = Math.max(240, initRect.height || window.innerHeight);
renderer.setSize(initW, initH);
renderer.domElement.setAttribute('data-testid', 'game-canvas');
renderer.domElement.tabIndex = 0;
renderer.domElement.className = 'block w-full h-full outline-none';
container.appendChild(renderer.domElement);

// WebGL context loss safety
const onContextLost = (e: Event) => e.preventDefault();
renderer.domElement.addEventListener('webglcontextlost', onContextLost);

// 2. Scene, Vivid Sky-Cerulean Water Backdrop & Studio Environment
const scene = new THREE.Scene();
const skyWaterHex = 0x4bb7ef;
scene.background = new THREE.Color(skyWaterHex);
scene.fog = new THREE.Fog(skyWaterHex, 58, 125);

const pmremGenerator = new THREE.PMREMGenerator(renderer);
const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
scene.environment = envTarget.texture;
scene.environmentIntensity = 0.36;
pmremGenerator.dispose();

// 3. Elevated Top-Down Heading-Up Chase Camera (miniature-diorama telephoto FOV behind the back of the van!)
const aspect = initW / initH;
const camera = new THREE.PerspectiveCamera(
  aspect < 0.95 ? 42 : CHASE_BASE_FOV,
  aspect,
  1.5,
  340,
);
const camLookTarget = new THREE.Vector3(0, 0.35, 0);
camera.position.set(0, CHASE_UP_HEIGHT, -CHASE_BACK_DIST);
camera.lookAt(camLookTarget);

// 4. Warm/Cool Color-Temperature 3-Point Daylight Rig
const hemiLight = new THREE.HemisphereLight(0xd4f0ff, 0x9ed95c, 0.72);
hemiLight.position.set(0, 40, 0);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xfff2d2, 1.48);
sunLight.position.set(18, 32, 14);
sunLight.castShadow = !isSoftwareGl;
sunLight.shadow.mapSize.set(1024, 1024);
const shadowBound = 29;
sunLight.shadow.camera.left = -shadowBound;
sunLight.shadow.camera.right = shadowBound;
sunLight.shadow.camera.top = shadowBound;
sunLight.shadow.camera.bottom = -shadowBound;
sunLight.shadow.camera.near = 2;
sunLight.shadow.camera.far = 85;
sunLight.shadow.bias = -0.0005;
sunLight.shadow.normalBias = 0.02;
scene.add(sunLight);
scene.add(sunLight.target);

const rimLight = new THREE.DirectionalLight(0xbbe6ff, 0.38);
rimLight.position.set(-16, 18, -18);
scene.add(rimLight);

// Endless Sky-Cerulean Canal Water Plane
const waterGeo = new THREE.PlaneGeometry(260, 260);
const waterMat = new THREE.MeshStandardMaterial({
  color: 0x3eaee8,
  roughness: 0.32,
  metalness: 0.04,
});
const waterPlane = new THREE.Mesh(waterGeo, waterMat);
waterPlane.rotation.x = -Math.PI / 2;
waterPlane.position.y = 0.0;
waterPlane.receiveShadow = true;
scene.add(waterPlane);

// Shared Textures & Beveled Tile Geometries
const maxAniso = renderer.capabilities.getMaxAnisotropy();
const textures = createProceduralTextures(maxAniso);

const sharedGeos = {
  curbBlock: createBeveledBlockGeometry(TILE_SIZE * 0.99, 0.24, TILE_SIZE * 0.99, 0.14, 0.03),
  grassCap: createBeveledBlockGeometry(TILE_SIZE * 0.97, 0.22, TILE_SIZE * 0.97, 0.14, 0.035),
  roadSlab: createBeveledBlockGeometry(TILE_SIZE * 0.995, 0.24, TILE_SIZE * 0.995, 0.08, 0.025),
  bridgeDeck: createBeveledBlockGeometry(TILE_SIZE * 0.96, 0.2, TILE_SIZE * 0.96, 0.1, 0.025),
  brickSeg: createBeveledBlockGeometry(TILE_SIZE * 0.3, 0.36, 0.3, 0.06, 0.022),
  crosswalkStripe: new THREE.BoxGeometry(0.18, 0.016, 0.72),
  cloudPuff: new THREE.SphereGeometry(0.28, 12, 10),
  chevronGeo: new THREE.ConeGeometry(0.32, 0.62, 4),
  particleSphere: new THREE.SphereGeometry(0.16, 8, 8),
};
sharedGeos.chevronGeo.rotateX(Math.PI / 2);

const sharedMats = {
  creamCurb: new THREE.MeshStandardMaterial({
    color: 0xf6f5ed,
    roughness: 0.65,
    metalness: 0.02,
  }),
  grassLush: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.78,
    metalness: 0.02,
    bumpMap: textures.clayBumpTex,
    bumpScale: 0.008,
  }),
  plazaSurface: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.plazaPaverTex,
    roughness: 0.64,
    metalness: 0.03,
  }),
  outerMeadow: new THREE.MeshStandardMaterial({
    color: 0xaee36d,
    roughness: 0.82,
    metalness: 0.01,
  }),
  innerRoad: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.innerPaverTex,
    roughness: 0.68,
    metalness: 0.03,
  }),
  outerRoad: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.outerRoadTex,
    roughness: 0.72,
    metalness: 0.03,
  }),
  woodBridge: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.woodBridgeTex,
    roughness: 0.62,
    metalness: 0.03,
  }),
  brickBase: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.68,
    metalness: 0.03,
  }),
  crosswalkWhite: new THREE.MeshStandardMaterial({
    color: 0xfbfdff,
    roughness: 0.55,
    metalness: 0.02,
  }),
  cloudWhite: new THREE.MeshStandardMaterial({
    color: 0xfafeff,
    roughness: 0.45,
    metalness: 0.0,
  }),
  boostPadMat: new THREE.MeshStandardMaterial({
    color: 0x26d09c,
    emissive: 0x10b981,
    emissiveIntensity: 0.45,
    roughness: 0.25,
  }),
  breadcrumbMat: new THREE.MeshStandardMaterial({
    color: 0xff7b29,
    emissive: 0xff9f1c,
    emissiveIntensity: 0.52,
    roughness: 0.25,
  }),
  particleMat: new THREE.MeshBasicMaterial({
    color: 0xffffff,
  }),
};
// Persistent Hero Truck Rig + Flanking 3D Near-Miss Wind-Streak Ribbons
const truckRig: ToyTruckRig = createToyTruckMesh(
  textures.shadowDiscTex,
  textures.clayBumpTex,
  9,
  vehicle,
  topper,
);
const windStreakRig: WindStreakRig = createWindStreakMesh();
truckRig.root.add(windStreakRig.root);
scene.add(truckRig.root);
  return {
    isSoftwareGl,
    renderer,
    initW,
    initH,
    scene,
    camera,
    camLookTarget,
    hemiLight,
    sunLight,
    rimLight,
    waterGeo,
    waterMat,
    waterPlane,
    envTarget,
    onContextLost,
    maxAniso,
    textures,
    sharedGeos,
    sharedMats,
    truckRig,
    windStreakRig,
  };
}

export type SceneStage = ReturnType<typeof createSceneStage>;
