import { createRuntimeState } from './runtimeState';
import { updateVisuals, type VisualDeps } from './visuals';
import { updateCameraFraming, type CameraFramingDeps } from './cameraFrame';
import { stepPlay, type PlayStepDeps } from './playStep';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CAMERA, POOLS } from '../../config/balance';
import { pokoAudio } from '../../game/audio';
import {
  CitizenStopRig,
  CoffeeKioskRig,
  CrashBurstRig,
  HazardRig,
  IslandBirdRig,
  MechanicGarageRig,
  PersonRig,
  RivalCourierRig,
  ToyTruckRig,
  TrafficSignalRig,
  WindStreakRig,
  createBeveledBlockGeometry,
  createCanalBoatMesh,
  createCitizenStopRig,
  createCoffeeKioskMesh,
  createCrashBurstMesh,
  createDetailedPersonMesh,
  createDuckCrossingMesh,
  createGreenWaveMesh,
  createHazardMesh,
  createIslandBirdMesh,
  createJumpRampMesh,
  createMechanicGarageMesh,
  createMiniParcelMesh,
  createPastelBuildingMesh,
  createProceduralTextures,
  createRivalCourierMesh,
  createSkyBalloonMesh,
  createSpinningCoinMesh,
  createStreetPropMesh,
  createStreetSignMesh,
  createToyTruckMesh,
  createTrafficSignalMesh,
  createTreeMesh,
  createWindStreakMesh,
} from '../../game/meshes';
import {
  generateProceduralCity,
  gridToWorld,
} from '../../game/proceduralCity';
import { VEHICLE_SPECS, computeRunRewards } from '../../game/progression';
import {
  BOOST_COOLDOWN_MAX_SEC,
  COMBO_WINDOW_SEC,
  CountdownMode,
  FEVER_COMBO_THRESHOLD,
  ParcelStackWobbleState,
  ROCKET_START_POINTS,
  StartCountdownState,
  WRONG_WAY_LIMIT_SEC,
  applyRocketStartToTruck,
  calculateDeliveryScore,
  checkDeliveryEligibility,
  createInitialTruckState,
  createParcelStackWobbleState,
  createStartCountdownState,
  evaluateRunStatus,
  getActiveStop,
  stepCoffeeKiosks,
  stepDuckCrossings,
  stepHazardsAndCollisions,
  stepMechanicGarages,
  stepMovingCustomers,
  stepParcelStackWobble,
  stepPedestriansPhysics,
  stepRivalCourier,
  stepStartCountdown,
  stepTrafficSignals,
  stepTruckPhysics,
  triggerMusicalHorn,
} from '../../game/rules';
import {
  DemoDirectorState,
  createDemoDirectorState,
  stepDemoDirector,
} from '../../game/demoDirector';
import { resetTouchControls, touchControls } from '../../game/touchControls';
import {
  CanalBoat,
  CrashEvent,
  DuckCrossing,
  GamePhase,
  GeneratedCity,
  GreenWavePickup,
  HazardKind,
  HazardPhase,
  HudBannerEvent,
  HudState,
  LevelConfig,
  OutcomeKind,
  ParcelKind,
  QuestKind,
  RiderShiftReceipt,
  RunSnapshot,
  ShiftAtmosphere,
  SidewalkPedestrian,
  SignalAxisState,
  SkyBalloon,
  TILE_SIZE,
  TileType,
  TopperId,
  TruckState,
  VehicleId,
} from '../../game/types';
import { MinimapSnapshot } from '../GameHud';
import { createEffectsSystem } from './effects';
import { buildStaticCityGeometry } from './cityGeometry';
import { buildCityActors, type SpawnedIslandBird } from './actors';
import { createSceneStage } from './sceneStage';
import { computeForwardRoadPath } from './navigation';
import { buildRunHudState } from './hudSnapshot';
import { attachInputListeners, clearInputState, createInputState } from './input';


import {
  CHASE_BACK_DIST,
  CHASE_BASE_FOV,
  CHASE_LOOK_AHEAD,
  CHASE_UP_HEIGHT,
  _color,
  _euler,
  _groundPlane,
  _intersectPt,
  _mat4,
  _ndc,
  _pos,
  _quat,
  _raycaster,
  _scale,
  wrapAngleRad,
} from './canvasMath';



export interface CanvasRuntimeRefs {
  phaseRef: { current: GamePhase };
  levelRef: { current: number };
  bestScoreRef: { current: number };
  vehicleRef: { current: VehicleId };
  topperRef: { current: TopperId };
  walletCoinsRef: { current: number };
  startShieldRef: { current: boolean };
  customCityConfigRef: { current: LevelConfig | null | undefined };
  onHudUpdateRef: { current: (hud: HudState) => void };
  onPhaseChangeRef: { current: (nextPhase: GamePhase) => void };
  onRunFinishedRef: { current: (snapshot: RunSnapshot) => void };
  onAwardLiveCoinsRef: { current: (delta: number) => void };
  onQuestEventRef: { current: (kind: QuestKind, amount?: number) => void };
  onConsumeStartShieldRef: { current: () => void };
  minimapSnapRef: { current: { current: MinimapSnapshot | null } };
  loadLevelFnRef: {
    current: ((lvl: number, resetScore: boolean, customCfg?: LevelConfig | null) => void) | null;
  };
  syncCosmeticsFnRef: { current: ((veh: VehicleId, top: TopperId) => void) | null };
}

export interface CanvasRuntimeDeps {
  container: HTMLDivElement;
  refs: CanvasRuntimeRefs;
}

export interface CanvasRuntime {
  dispose: () => void;
}

// Owns the WebGL renderer, the simulation loop and every mutable closure variable for one
// mounted canvas. React only mounts it once per mount and disposes it on unmount.
export function createCanvasRuntime({ container, refs }: CanvasRuntimeDeps): CanvasRuntime {
  const {
    phaseRef,
    levelRef,
    bestScoreRef,
    vehicleRef,
    topperRef,
    walletCoinsRef,
    startShieldRef,
    customCityConfigRef,
    onHudUpdateRef,
    onPhaseChangeRef,
    onRunFinishedRef,
    onAwardLiveCoinsRef,
    onQuestEventRef,
    onConsumeStartShieldRef,
    minimapSnapRef,
    loadLevelFnRef,
    syncCosmeticsFnRef,
  } = refs;


    const stage = createSceneStage({
      container,
      vehicle: vehicleRef.current,
      topper: topperRef.current,
    });
    const {
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
    } = stage;

    // Pooled visual effects (particles / breadcrumbs / flying parcels & tip coins / crash bursts)
    const fx = createEffectsSystem({
      scene,
      assets: {
        particleSphere: sharedGeos.particleSphere,
        particleMat: sharedMats.particleMat,
        chevronGeo: sharedGeos.chevronGeo,
        breadcrumbMat: sharedMats.breadcrumbMat,
      },
      onCoinLand: (coinIdx, coinX, coinY, coinZ) => {
        pokoAudio.playCoinTossClink(coinIdx);
        S.truckState.squashY = Math.max(0.88, S.truckState.squashY - 0.035);
        fx.spawnParticleBurst(coinX, coinY + 0.1, coinZ, 4, [0xffe524, 0xffffff, 0xff9f1c], 0.6);
      },
    });
    const { flyingParcels, flyingCoins } = fx;
    const spawnParticleBurst = fx.spawnParticleBurst;


    // Level World Container (rebuilt cleanly per level)
  const S = createRuntimeState({ levelRef, walletCoinsRef, vehicleRef, startShieldRef, scene });

    function awardRunCoins(delta: number) {
      if (delta <= 0) return;
      if (S.demoState.active) {
        S.demoSandboxCoins += delta;
      } else {
        onAwardLiveCoinsRef.current(delta);
      }
    }

    function recordQuestEvent(kind: QuestKind, amount: number = 1) {
      if (S.demoState.active) return;
      onQuestEventRef.current(kind, amount);
    }

    // Unified Input State (hoisted so buildCityScene always starts with clean held/edge keys!)
    const input = createInputState();

    function clearAllInputs() {
      clearInputState(input);
      resetTouchControls();
    }

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

    function syncTruckParcelStack() {
      const remaining = S.currentCity.stops.filter((s) => !s.delivered).length;
      truckRig.parcelBoxes.forEach((box, idx) => {
        box.visible = idx < remaining;
      });
    }

    function syncMinimapSnapshot() {
      const snap = minimapSnapRef.current.current;
      if (!snap) return;
      const activeStop = getActiveStop(S.currentCity.stops);
      snap.city = S.currentCity;
      snap.truckX = S.truckState.x;
      snap.truckZ = S.truckState.z;
      snap.truckYaw = S.truckState.yaw;
      snap.activeStopIndex = activeStop ? activeStop.index : -1;
    }

    function refreshForwardRoadPath() {
      S.cachedRoadPath = computeForwardRoadPath(
        S.currentCity,
        S.truckState,
        getActiveStop(S.currentCity.stops),
      );
    }
    function emitHudSnapshot() {
      onHudUpdateRef.current(
        buildRunHudState({
          currentCity: S.currentCity,
          truckState: S.truckState,
          score: S.score,
          combo: S.combo,
          comboTimer: S.comboTimer,
          timeRemainingSec: S.timeRemainingSec,
          bannerEvent: S.bannerEvent,
          countdownState: S.countdownState,
          demoState: S.demoState,
          demoSandboxCoins: S.demoSandboxCoins,
          getCachedRoadPath: () => S.cachedRoadPath,
          lastEarningEvent: S.lastEarningEvent,
          riderBaseIncome: S.riderBaseIncome,
          riderOnTimeBonus: S.riderOnTimeBonus,
          riderHotMealTip: S.riderHotMealTip,
          riderBullseyeTip: S.riderBullseyeTip,
          riderRushHourBonus: S.riderRushHourBonus,
          riderSpillDeduction: S.riderSpillDeduction,
          riderTrafficFines: S.riderTrafficFines,
          riderLateDeduction: S.riderLateDeduction,
          riderReviewScore: S.riderReviewScore,
          walletCoins: walletCoinsRef.current,
          bestScore: bestScoreRef.current,
          refreshForwardRoadPath,
          syncMinimapSnapshot,
        }),
      );
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
        onConsumeStartShieldRef.current();
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

    loadLevelFnRef.current = (lvl: number, resetScore: boolean, customCfg?: LevelConfig | null) => {
      S.demoState = createDemoDirectorState();
      buildCityScene(lvl, resetScore, customCfg);
    };
    syncCosmeticsFnRef.current = (veh: VehicleId, top: TopperId) => {
      if (S.demoState.active) return;
      truckRig.setVehicleStyle(veh);
      truckRig.setTopper(top);
      const spec = VEHICLE_SPECS[veh] ?? VEHICLE_SPECS[VehicleId.ClassicVan];
      if (S.truckState.vehicleId !== veh) {
        S.truckState.vehicleId = veh;
        const hpDelta = spec.maxHealth - S.truckState.maxHealth;
        S.truckState.maxHealth = spec.maxHealth;
        S.truckState.health = Math.max(
          1,
          Math.min(spec.maxHealth, S.truckState.health + Math.max(0, hpDelta)),
        );
        S.truckState.shockAbsorberAvailable = spec.hasShockAbsorber;
        emitHudSnapshot();
      }
    };
    buildCityScene(levelRef.current, true);

    // 5. Unified Input Listeners (held vs justPressed, Space buffer, focus-loss reset, pointer steer)
    const detachInput = attachInputListeners({
      state: input,
      canvas: renderer.domElement,
      getPhase: () => phaseRef.current,
      isDemoActive: () => S.demoState.active,
      playClick: () => pokoAudio.playUiClick(),
      onExitDemo: stopDemoReel,
      onTogglePause: (next) => onPhaseChangeRef.current(next),
      onFocusLost: clearAllInputs,
    });

    function screenToWorldOnRoad(clientX: number, clientY: number): THREE.Vector3 | null {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      _ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      _raycaster.setFromCamera(_ndc, camera);
      return _raycaster.ray.intersectPlane(_groundPlane, _intersectPt);
    }

    // ResizeObserver for crisp projection without hardcoded viewport sizes
    const updateCameraSize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(320, rect.width);
      const h = Math.max(240, rect.height);
      const asp = w / h;
      camera.fov = asp < 0.95 ? 42 : CHASE_BASE_FOV;
      camera.aspect = asp;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObs = new ResizeObserver(updateCameraSize);
    resizeObs.observe(container);

    // Complete delivery helper
    function triggerParcelDelivery(
      viaExpressToss: boolean,
      isBullseye: boolean = false,
    ) {
      const activeStop = getActiveStop(S.currentCity.stops);
      if (!activeStop || activeStop.delivered) return;

      activeStop.delivered = true;
      activeStop.deliveredViaToss = viaExpressToss;

      const wasFragileIntact = S.truckState.fragileIntact;
      const reward = calculateDeliveryScore(
        S.combo,
        S.comboTimer,
        viaExpressToss,
        S.currentCity.config.level,
        activeStop.parcelKind,
        wasFragileIntact,
        {
          bullseye: isBullseye,
          thermalTimer: S.truckState.thermalTimer,
          vipRole: activeStop.vipRole,
          ticketsCount: S.truckState.ticketsCount,
        },
      );
      S.score += reward.pointsAwarded;
      S.combo = reward.nextCombo;
      S.maxCombo = Math.max(S.maxCombo, S.combo);
      S.comboTimer = COMBO_WINDOW_SEC;
      if (isBullseye) {
        S.bullseyeCount += 1;
        recordQuestEvent('bullseye_drops', 1);
      }
      if (viaExpressToss) {
        recordQuestEvent('express_tosses', 1);
      }
      if (S.truckState.ticketsCount === 0) {
        recordQuestEvent('clean_deliveries', 1);
      }
      awardRunCoins(reward.coinsAwarded);
      pokoAudio.setFeverMode(reward.isFever);

      // Accumulate Food Delivery Rider earnings (¥)
      S.riderBaseIncome += reward.baseDeliveryFeeYuan;
      S.riderOnTimeBonus += reward.onTimeBonusYuan;
      S.riderHotMealTip += (reward.thermalBonus > 0 ? 3.5 : 0) + (reward.vipBonus > 0 ? 3.5 : 0);
      S.riderBullseyeTip += (isBullseye ? 2.0 : 0) + (reward.pristineBonus > 0 ? 2.0 : 0) + (reward.isFever ? 2.0 : 0);
      S.riderSpillDeduction += reward.spillPenaltyYuan;
      if (reward.spillPenaltyYuan > 0) {
        S.riderReviewScore = Math.max(3.0, Number((S.riderReviewScore - 0.15).toFixed(2)));
      } else if (isBullseye || reward.thermalBonus > 0) {
        S.riderReviewScore = Math.min(5.0, Number((S.riderReviewScore + 0.05).toFixed(2)));
      }
      S.lastEarningEvent = {
        id: ++S.earningSeq,
        label: reward.spillPenaltyYuan > 0 ? '外卖送达(餐损扣款)' : '外卖送达收益',
        amountYuan: reward.netDeliveryEarningsYuan,
        isReward: true,
      };
      S.earningEventTimer = 2.4;

      const boomerangBonusPts = activeStop.isBoomerangTrigger ? 150 : 0;
      const boomerangTimeSec = activeStop.isBoomerangTrigger ? 4 : 0;
      S.score += boomerangBonusPts;

      S.timeRemainingSec = Math.min(
        S.currentCity.config.timeLimitSec + 22,
        S.timeRemainingSec + reward.timeBonusSec + boomerangTimeSec,
      );

      // Reset fragile handling & hot express thermal status fresh for the upcoming parcel!
      S.truckState.fragileIntact = true;
      S.truckState.thermalTimer = S.truckState.thermalMaxSec;
      S.truckState.squashY = 0.82;
      S.truckState.squashVel = 3.6;
      syncTruckParcelStack();
      S.lastPathCalcTime = -1;
      refreshForwardRoadPath();

      const dropLabel = activeStop.isBoomerangTrigger
        ? 'Boomerang Rush Bonus!'
        : isBullseye
          ? 'Bullseye Perfect Toss!'
          : reward.thermalBonus > 0
            ? 'Piping-Hot Express!'
            : reward.vipBonus > 0
              ? 'VIP Priority Bonus!'
              : activeStop.parcelKind === ParcelKind.Large
                ? 'Heavy Crate Unloaded!'
                : reward.pristineBonus > 0
                  ? 'Pristine Fragile Bonus!'
                  : viaExpressToss
                    ? 'Express Toss!'
                    : 'Curbside Drop!';

      S.bannerEvent = {
        id: ++S.bannerSeq,
        label: dropLabel,
        detail: `+${reward.pointsAwarded + boomerangBonusPts} pts · +${reward.coinsAwarded} Coins`,
        tone:
          isBullseye || reward.isFever || reward.pristineBonus > 0 || viaExpressToss
            ? 'emerald'
            : 'amber',
      };
      S.bannerTimer = 2.05;

      pokoAudio.playTossWhoosh();
      pokoAudio.playDeliverySuccess(S.combo, viaExpressToss, isBullseye);

      // Launch visible 3D parcel arc to citizen!
      const stopIdx = activeStop.index - 1;
      const cRig = S.citizenRigs[stopIdx];
      const cw = gridToWorld(activeStop.citizenCoord, S.currentCity.totalGridSize);
      const targetX = activeStop.liveCitizenX ?? cw.x;
      const targetZ = activeStop.liveCitizenZ ?? cw.z;

      const fp =
        flyingParcels.find((item) => !item.active) ?? flyingParcels[0];
      fp.active = true;
      fp.t = 0;
      fp.duration = viaExpressToss ? 0.34 : 0.24;
      fp.sx = S.truckState.x;
      fp.sy = 1.25 + S.truckState.y;
      fp.sz = S.truckState.z;
      fp.tx = targetX;
      fp.ty = 0.65;
      fp.tz = targetZ;
      fp.mesh.visible = true;
      fp.onLand = () => {
        if (cRig) {
          cRig.deliveredParcel.visible = true;
          cRig.pinSprite.visible = false;
          cRig.padGroup.visible = false;
        }
        spawnParticleBurst(
          targetX,
          1.0,
          targetZ,
          isBullseye ? 24 : 18,
          [0xffd166, 0xff70a6, 0x70d6ff, 0x9ef01a],
          isBullseye ? 1.35 : 1.15,
        );

        // Customer excitedly tosses 4 spinning 3D Gold Tip Coins onto the Courier Van roof!
        const tipCount = isBullseye ? 4 : 3;
        for (let c = 0; c < tipCount; c++) {
          fx.spawnFlyingCoin({
            sx: targetX,
            sy: 1.18,
            sz: targetZ,
            delay: c * 0.085,
            duration: 0.44,
            coinIdx: c,
          });
        }
      };

      emitHudSnapshot();
    }

    // 6. Main Simulation & Render Loop (with software-WebGL afterDraw pacing!)

    function afterDraw(cb: () => void) {
      if (S.disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (S.disposed) return;
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          S.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          S.frameId = window.setTimeout(cb, 80);
        }
      };
      S.frameId = window.setTimeout(poll, 5);
    }

    const visualDeps: VisualDeps = { fx, truckRig, windStreakRig, refreshForwardRoadPath };

    const cameraFramingDeps: CameraFramingDeps = {
      camera,
      camLookTarget,
      scene,
      waterPlane,
      sunLight,
    };

    const playStepDeps: PlayStepDeps = {
      fx,
      spawnParticleBurst,
      input,
      clearAllInputs,
      truckRig,
      cameraFramingDeps,
      bestScoreRef,
      onRunFinishedRef,
      awardRunCoins,
      recordQuestEvent,
      emitHudSnapshot,
      refreshForwardRoadPath,
      syncMinimapSnapshot,
      syncTruckParcelStack,
      screenToWorldOnRoad,
      triggerParcelDelivery,
      startDemoReel,
      stopDemoReel,
    };

    function tick() {
      if (S.disposed) return;
      const now = performance.now();
      const rawDt = (now - S.lastTime) / 1000;
      S.lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
      const cdDt = Math.min(Math.max(rawDt, 0.001), 0.35);
      S.visualClock += dt;

      const currentPhase = phaseRef.current;

      // Hit flash decay
      if (S.hitFlashTimer > 0) {
        S.hitFlashTimer = Math.max(0, S.hitFlashTimer - dt);
        for (const mat of truckRig.bodyMaterials) {
          mat.emissive.setHex(S.hitFlashTimer > 0 ? 0xffffff : 0x000000);
          mat.emissiveIntensity = S.hitFlashTimer > 0 ? 0.65 : 0;
        }
      }

      // Camera trauma decay
      if (S.cameraTrauma > 0) {
        S.cameraTrauma = Math.max(0, S.cameraTrauma - dt * 1.9);
      }

      if (S.bannerTimer > 0) {
        S.bannerTimer = Math.max(0, S.bannerTimer - cdDt);
        if (S.bannerTimer <= 0 && S.bannerEvent) {
          S.bannerEvent = null;
          emitHudSnapshot();
        }
      }
      if (S.earningEventTimer > 0) {
        S.earningEventTimer = Math.max(0, S.earningEventTimer - cdDt);
        if (S.earningEventTimer <= 0 && S.lastEarningEvent) {
          S.lastEarningEvent = null;
          emitHudSnapshot();
        }
      }

      // Update continuous speed-reactive van engine hum
      pokoAudio.updateEngine(
        S.truckState.speed,
        S.truckState.boostTimer > 0,
        currentPhase === GamePhase.Playing &&
          S.finishDelayTimer < 0 &&
          !S.countdownState.isFrozen,
      );

      if (S.windStreakTimer > 0) {
        S.windStreakTimer = Math.max(0, S.windStreakTimer - dt);
      }
      if (S.treeFlutterCooldown > 0) {
        S.treeFlutterCooldown = Math.max(0, S.treeFlutterCooldown - dt);
      }

      if (currentPhase === GamePhase.Title) {
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
      } else if (currentPhase === GamePhase.Playing) {
        stepPlay(dt, cdDt, now, S, playStepDeps);
      }

      input.keysJustPressed.clear();

      updateVisuals(dt, S, visualDeps, currentPhase);

      renderer.render(scene, camera);


      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        S.frameId = requestAnimationFrame(tick);
      }
    }


    S.frameId = requestAnimationFrame(tick);

  return {
    dispose: () => {
        S.disposed = true;
        pokoAudio.setMusicPlaying(false);
        cancelAnimationFrame(S.frameId);
        clearTimeout(S.frameId);
        resizeObs.disconnect();
        detachInput();
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost);

        disposeLevelGroup();
        fx.dispose();
        Object.values(sharedGeos).forEach((g) => g.dispose());
        Object.values(sharedMats).forEach((m) => m.dispose());
        waterGeo.dispose();
        waterMat.dispose();
        textures.dispose();
        envTarget.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
    },
  };
}
