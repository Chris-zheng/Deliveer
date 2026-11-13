import * as THREE from 'three';
import { TILE_SIZE } from '../../config/balance';
import { pokoAudio } from '../../game/audio';
import { createDemoDirectorState } from '../../game/demoDirector';
import { createCanalBoatMesh } from '../../game/meshes';
import type { ProceduralTextures } from '../../game/meshes';
import { generateProceduralCity } from '../../game/proceduralCity';
import {
  createInitialTruckState,
  type CountdownMode,
  createParcelStackWobbleState,
  createStartCountdownState,
} from '../../game/rules';
import { touchControls } from '../../game/touchControls';
import { setActiveWeather } from '../../game/weather';
import type { WeatherKind } from '../../game/weather';
import { GamePhase, OutcomeKind, ShiftAtmosphere } from '../../game/types';
import type { LevelConfig, TopperId, VehicleId } from '../../game/types';
import type { ToyTruckRig } from '../../game/meshes';
import { buildCityActors } from './actors';
import { buildStaticCityGeometry } from './cityGeometry';
import { CHASE_BACK_DIST, CHASE_LOOK_AHEAD, CHASE_UP_HEIGHT } from './canvasMath';
import type { FlyingCoin, FlyingParcel } from './effects';
import type { RuntimeState } from './runtimeState';

type GeometryBag = Record<string, THREE.BufferGeometry>;
type MaterialBag = Record<string, THREE.Material>;

// Scene handles and runtime closures the level builder needs from the mounted stage.
export interface LevelStageHandles {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  camLookTarget: THREE.Vector3;
  waterMat: THREE.MeshStandardMaterial;
  waterPlane: THREE.Mesh;
  sunLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  rimLight: THREE.DirectionalLight;
  truckRig: ToyTruckRig;
  windStreakRig: { root: THREE.Object3D };
  textures: ProceduralTextures;
  maxAniso: number;
  sharedGeos: GeometryBag;
  sharedMats: MaterialBag;
  isSoftwareGl: boolean;
  flyingCoins: FlyingCoin[];
  flyingParcels: FlyingParcel[];
  phaseRef: { current: GamePhase };
  levelRef: { current: number };
  vehicleRef: { current: VehicleId };
  topperRef: { current: TopperId };
  walletCoinsRef: { current: number };
  startShieldRef: { current: boolean };
  customCityConfigRef: { current: LevelConfig | null | undefined };
  onConsumeStartShieldRef: { current: (() => void) | null };
  clearAllInputs: () => void;
  emitHudSnapshot: () => void;
  refreshForwardRoadPath: () => void;
  syncTruckParcelStack: () => void;
}

// Owns building, disposing and re-skinning the level world (city geometry, actors, rigs,
// atmosphere, demo reel). Created once per mounted canvas.
export function createLevelScene(S: RuntimeState, handles: LevelStageHandles) {
  const {
    scene,
    camera,
    renderer,
    camLookTarget,
    waterMat,
    waterPlane,
    sunLight,
    hemiLight,
    rimLight,
    truckRig,
    windStreakRig,
    textures,
    maxAniso,
    sharedGeos,
    sharedMats,
    isSoftwareGl,
    flyingCoins,
    flyingParcels,
    phaseRef,
    levelRef,
    vehicleRef,
    topperRef,
    walletCoinsRef,
    startShieldRef,
    customCityConfigRef,
    onConsumeStartShieldRef,
    clearAllInputs,
    emitHudSnapshot,
    refreshForwardRoadPath,
    syncTruckParcelStack,
  } = handles;
    function disposeLevelGroup() {
      for (const cr of S.citizenRigs) {
        cr.disposeTextures();
      }
      S.citizenRigs = [];
      S.hazardRigs = [];
      S.signalRigs = [];
      S.kioskRigs = [];
      S.garageRigs = [];
      S.duckRigs = [];
      S.greenWaveRigs = [];
      S.rivalRig = null;
      S.balloonRigs = [];
      S.pedestrianRigs = [];
      S.boatRigs = [];
      S.birdRigs = [];
      S.rampBeaconGroups = [];
      for (const fc of flyingCoins) {
        fc.active = false;
        fc.mesh.visible = false;
      }
      for (const fp of flyingParcels) {
        fp.active = false;
        fp.mesh.visible = false;
        fp.onLand = undefined;
      }
      scene.remove(S.levelGroup);
      S.levelGroup.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          if (
            !m.geometry.userData?.shared &&
            !Object.values(sharedGeos).includes(m.geometry as never)
          ) {
            m.geometry.dispose();
          }
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          for (const mat of mats) {
            if (
              !mat.userData?.shared &&
              !Object.values(sharedMats).includes(mat as never)
            ) {
              mat.dispose();
            }
          }
        }
      });
      S.levelGroup = new THREE.Group();
      scene.add(S.levelGroup);
    }

    function applyAtmosphereRig(atm: ShiftAtmosphere) {
      if (atm === ShiftAtmosphere.GoldenSunset) {
        scene.background = new THREE.Color(0xf4976c);
        scene.fog = new THREE.Fog(0xf4976c, 58, 128);
        waterMat.color.setHex(0x2b8cbe);
        sunLight.color.setHex(0xffb36b);
        sunLight.intensity = 1.62;
        hemiLight.color.setHex(0xffd6a5);
        hemiLight.groundColor.setHex(0x8ab17d);
        hemiLight.intensity = 0.78;
        rimLight.color.setHex(0xfde68a);
        rimLight.intensity = 0.44;
        truckRig.headlightCones.visible = false;
      } else if (atm === ShiftAtmosphere.TwilightNeon) {
        scene.background = new THREE.Color(0x1d3557);
        scene.fog = new THREE.Fog(0x1d3557, 54, 122);
        waterMat.color.setHex(0x152844);
        sunLight.color.setHex(0xa8dadc);
        sunLight.intensity = 0.96;
        hemiLight.color.setHex(0x5289b5);
        hemiLight.groundColor.setHex(0x2b4560);
        hemiLight.intensity = 0.92;
        rimLight.color.setHex(0xf72585);
        rimLight.intensity = 0.45;
        truckRig.headlightCones.visible = true;
      } else {
        scene.background = new THREE.Color(0x4bb7ef);
        scene.fog = new THREE.Fog(0x4bb7ef, 58, 125);
        waterMat.color.setHex(0x3eaee8);
        sunLight.color.setHex(0xfff2d2);
        sunLight.intensity = 1.48;
        hemiLight.color.setHex(0xd4f0ff);
        hemiLight.groundColor.setHex(0x9ed95c);
        hemiLight.intensity = 0.72;
        rimLight.color.setHex(0xbbe6ff);
        rimLight.intensity = 0.38;
        truckRig.headlightCones.visible = false;
      }
    }

    function applyWeatherRig(kind: WeatherKind) {
      const baseAtmosphere = S.currentCity
        ? S.currentCity.config.atmosphere
        : ShiftAtmosphere.SunnyHarbor;
      applyAtmosphereRig(baseAtmosphere);
      const fog = scene.fog;
      if (!(fog instanceof THREE.Fog)) return;

      if (kind === 'rain') {
        scene.background = new THREE.Color(0x5b6c75);
        fog.color.setHex(0x5b6c75);
        fog.near = 34;
        fog.far = 96;
        sunLight.intensity = 0.92;
        hemiLight.intensity = 0.62;
      } else if (kind === 'fog') {
        scene.background = new THREE.Color(0xd3e2e6);
        fog.color.setHex(0xd3e2e6);
        fog.near = 13;
        fog.far = 52;
        sunLight.intensity = 1.08;
        hemiLight.intensity = 0.66;
      }

      truckRig.headlightCones.visible =
        kind !== 'clear' || baseAtmosphere === ShiftAtmosphere.TwilightNeon;
    }

    function buildCityScene(lvl: number, resetScore: boolean, customCfg?: LevelConfig | null) {
      clearAllInputs();
      disposeLevelGroup();
      const effectiveCfg =
        customCfg !== undefined
          ? (customCfg ?? undefined)
          : (customCityConfigRef.current ?? undefined);
      S.currentCity = generateProceduralCity(lvl, undefined, effectiveCfg);
      const grantShield =
        !S.demoState.active &&
        startShieldRef.current &&
        phaseRef.current === GamePhase.Playing;
      const activeVeh = S.demoState.active
        ? S.demoState.vehicleId
        : vehicleRef.current;
      const activeTop = S.demoState.active
        ? S.demoState.topperId
        : topperRef.current;
      S.truckState = createInitialTruckState(
        S.currentCity,
        activeVeh,
        grantShield,
      );
      if (grantShield) {
        onConsumeStartShieldRef.current?.();
      }
      truckRig.setVehicleStyle(activeVeh);
      truckRig.setTopper(activeTop);
      applyAtmosphereRig(S.currentCity.config.atmosphere);
      pokoAudio.setFeverMode(false);

      if (resetScore) {
        S.score = 0;
      }
      S.combo = 0;
      S.comboTimer = 0;
      S.maxCombo = 0;
      S.bullseyeCount = 0;
      S.timeRemainingSec = S.currentCity.config.timeLimitSec;
      S.elapsedSec = 0;
      S.hitstopTimer = 0;
      S.cameraTrauma = 0;
      S.hitFlashTimer = 0;
      S.finishDelayTimer = -1;
      S.pendingOutcome = OutcomeKind.None;
      S.lastPathCalcTime = -1;
      S.cachedRoadPath = [];
      S.bannerEvent = null;
      S.bannerTimer = 0;
      S.lastTickedSecond = -1;
      S.riderBaseIncome = 0;
      S.riderOnTimeBonus = 0;
      S.riderHotMealTip = 0;
      S.riderBullseyeTip = 0;
      S.riderRushHourBonus = 0;
  S.rushPromiseSec = -1;
      S.weatherElapsedSec = 0;
      S.weatherKind = 'clear';
      setActiveWeather('clear');
      S.riderSpillDeduction = 0;
      S.riderTrafficFines = 0;
      S.riderLateDeduction = 0;
      S.riderReviewScore = 5.0;
      S.lastEarningEvent = null;
      S.earningEventTimer = 0;

      buildStaticCityGeometry({
        levelGroup: S.levelGroup,
        city: S.currentCity,
        textures,
        sharedGeos,
        sharedMats,
      });
      const N = S.currentCity.totalGridSize;

      for (const boat of S.currentCity.canalBoats) {
        const bMesh = createCanalBoatMesh(boat);
        S.levelGroup.add(bMesh);
        S.boatRigs.push({ data: boat, mesh: bMesh });
      }

      // 8B-13. Per-level actors (pedestrians, stops, hazards, signals, kiosks, balloons,
      // garages, ramps, duck crossings, green-wave orbs, rival courier, circling birds).
      const actorResult = buildCityActors({
        levelGroup: S.levelGroup,
        city: S.currentCity,
        N,
        textures,
        maxAniso,
        rigs: {
          citizen: S.citizenRigs,
          hazard: S.hazardRigs,
          signal: S.signalRigs,
          kiosk: S.kioskRigs,
          garage: S.garageRigs,
          duck: S.duckRigs,
          greenWave: S.greenWaveRigs,
          balloon: S.balloonRigs,
          pedestrian: S.pedestrianRigs,
          boat: S.boatRigs,
          bird: S.birdRigs,
          rampBeacons: S.rampBeaconGroups,
        },
      });
      S.rivalRig = actorResult.rival;
      // Reset parcel wobble & wind streaks
      S.parcelWobble = createParcelStackWobbleState(S.truckState.yaw);
      S.windStreakTimer = 0;
      windStreakRig.root.visible = false;
      S.victoryOrbitAngle = 0;
      S.victoryConfettiAccum = 0;
      S.birdChirpTimer = 1.4;
      S.treeFlutterCooldown = 0;
      S.revExhaustAccum = 0;

      // Initialize 3 - 2 - 1 - GO! Bird's-Eye Island Overview Swoop when starting a Playing shift!
      if (phaseRef.current === GamePhase.Playing) {
        const isSameStageRetry = S.lastStartedLevel === lvl;
        const cdMode: CountdownMode = S.demoState.active
          ? 'quick'
          : isSameStageRetry
            ? 'quick'
            : 'full';
        if (!S.demoState.active) {
          S.lastStartedLevel = lvl;
        }
        S.countdownState = createStartCountdownState(cdMode);
        pokoAudio.playCountdownBeep(3);
        if (S.currentCity.config.atmosphere !== ShiftAtmosphere.TwilightNeon) {
          pokoAudio.playBirdChirp(0.7);
        }
      } else {
        S.countdownState = createStartCountdownState('instant');
      }

      // Position truck at spawn & set initial camera (Bird's-Eye Overview on Playing start, Chase on Title!)
      truckRig.root.position.set(S.truckState.x, 0.24, S.truckState.z);
      truckRig.root.rotation.y = S.truckState.yaw;
      truckRig.shieldRing.visible = S.truckState.hasBumperShield;
      S.camYaw = S.truckState.yaw;
      if (S.countdownState.isFrozen) {
        const isPortrait = camera.aspect < 0.95;
        const islandSpan = S.currentCity.totalGridSize * TILE_SIZE;
        const ovwYaw = S.demoState.active
          ? Math.PI / 2 - 0.34
          : S.truckState.yaw - 0.34;
        const ovwHeight = islandSpan * (isPortrait ? 1.56 : 1.44);
        const ovwBack = islandSpan * (isPortrait ? 1.04 : 0.94);
        camLookTarget.set(0, 0.4, 0);
        camera.position.set(
          -Math.sin(ovwYaw) * ovwBack,
          ovwHeight,
          -Math.cos(ovwYaw) * ovwBack,
        );
        camera.lookAt(camLookTarget);
        if (scene.fog instanceof THREE.Fog) {
          scene.fog.near = 155;
          scene.fog.far = 290;
        }
      } else {
        camLookTarget.set(
          S.truckState.x + Math.sin(S.camYaw) * CHASE_LOOK_AHEAD,
          0.35,
          S.truckState.z + Math.cos(S.camYaw) * CHASE_LOOK_AHEAD,
        );
        camera.position.set(
          camLookTarget.x - Math.sin(S.camYaw) * CHASE_BACK_DIST,
          camLookTarget.y + CHASE_UP_HEIGHT,
          camLookTarget.z - Math.cos(S.camYaw) * CHASE_BACK_DIST,
        );
        camera.lookAt(camLookTarget);
      }
      waterPlane.position.set(camLookTarget.x, 0.0, camLookTarget.z);
      sunLight.position.set(camLookTarget.x + 18, 32, camLookTarget.z + 14);
      sunLight.target.position.copy(camLookTarget);
      syncTruckParcelStack();
      refreshForwardRoadPath();
      emitHudSnapshot();

      if (!isSoftwareGl) {
        renderer.compile(scene, camera);
      }
    }

    function startDemoReel() {
      touchControls.demoTogglePulse = false;
      S.demoState = createDemoDirectorState();
      S.demoState.active = true;
      S.demoSandboxCoins = walletCoinsRef.current;
      buildCityScene(1, true);
    }

    function stopDemoReel() {
      touchControls.demoTogglePulse = false;
      S.demoState = createDemoDirectorState();
      pokoAudio.setFeverMode(false);
      buildCityScene(levelRef.current, true);
    }

  return {
    disposeLevelGroup,
    applyAtmosphereRig,
    applyWeatherRig,
    buildCityScene,
    startDemoReel,
    stopDemoReel,
  };
}
