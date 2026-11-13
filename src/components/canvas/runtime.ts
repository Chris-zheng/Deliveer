import { createRuntimeState } from './runtimeState';
import { updateVisuals, type VisualDeps } from './visuals';
import { updateCameraFraming, type CameraFramingDeps } from './cameraFrame';
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
        // Toggle 45-second Choreographed Demo Reel [Bottom HUD Timer Button or T]
        if (touchControls.demoTogglePulse || input.keysJustPressed.has('KeyT')) {
          touchControls.demoTogglePulse = false;
          input.keysJustPressed.delete('KeyT');
          if (S.demoState.active) {
            stopDemoReel();
          } else {
            startDemoReel();
          }
        }

        const demoOut = S.demoState.active
          ? stepDemoDirector(
              S.demoState,
              S.truckState,
              S.currentCity,
              S.cachedRoadPath,
              S.countdownState.stage,
              cdDt,
            )
          : null;

        if (demoOut?.completed) {
          stopDemoReel();
        } else {
          if (demoOut?.changedVehicle) {
            const nextVeh = demoOut.changedVehicle.vehicleId;
            const nextTop = demoOut.changedVehicle.topperId;
            truckRig.setVehicleStyle(nextVeh);
            truckRig.setTopper(nextTop);
            const spec =
              VEHICLE_SPECS[nextVeh] ?? VEHICLE_SPECS[VehicleId.ClassicVan];
            S.truckState.vehicleId = nextVeh;
            S.truckState.maxHealth = spec.maxHealth;
            S.truckState.health = spec.maxHealth;
            S.truckState.shockAbsorberAvailable = spec.hasShockAbsorber;
            S.truckState.squashY = 1.15;
            S.truckState.squashVel = -2.2;
            spawnParticleBurst(
              S.truckState.x,
              0.7,
              S.truckState.z,
              18,
              [0xffe524, 0x38bdf8, 0xff70a6, 0xffffff],
              1.1,
            );
          }

          if (demoOut?.changedScene) {
            S.camYaw = S.truckState.yaw;
            S.parcelWobble = createParcelStackWobbleState(S.truckState.yaw);
            S.lastPathCalcTime = -1;
            syncTruckParcelStack();
            refreshForwardRoadPath();
            if (demoOut.changedScene === 'scene2_bullseye_fever') {
              S.combo = 2;
              S.comboTimer = COMBO_WINDOW_SEC;
              S.bannerEvent = {
                id: ++S.bannerSeq,
                label: 'Kei Truck · Bullseye Rush!',
                detail: 'Curbside Toss & 2x Fever Showcase',
                tone: 'emerald',
              };
              S.bannerTimer = 1.5;
            } else if (demoOut.changedScene === 'scene3_canal_jump') {
              S.bannerEvent = {
                id: ++S.bannerSeq,
                label: 'Zippy Trike · Canal Stunt!',
                detail: 'Lining Up on Yellow Jump Ramp!',
                tone: 'amber',
              };
              S.bannerTimer = 1.4;
            } else if (demoOut.changedScene === 'scene4_clash_shield') {
              pokoAudio.setFeverMode(false);
              S.combo = 0;
              S.comboTimer = 0;
              S.bannerEvent = {
                id: ++S.bannerSeq,
                label: 'Step-Van · Rush-Hour Clash!',
                detail: '3D Traffic Impact & Shield Pit-Stop',
                tone: 'amber',
              };
              S.bannerTimer = 1.45;
            } else if (demoOut.changedScene === 'scene5_finale_orbit') {
              S.finishDelayTimer = -1;
              S.pendingOutcome = OutcomeKind.None;
              S.bannerEvent = {
                id: ++S.bannerSeq,
                label: 'Final Parcel · Stage Finale!',
                detail: 'Delivering Last Package!',
                tone: 'emerald',
              };
              S.bannerTimer = 1.4;
            }
            emitHudSnapshot();
          }

          if (demoOut?.triggerGarageSaveShowcase) {
            S.truckState.hasBumperShield = true;
            S.truckState.health = S.truckState.maxHealth;
            pokoAudio.playMechanicWrench();
            S.bannerEvent = {
              id: ++S.bannerSeq,
              label: 'Wrench Pit-Stop!',
              detail: 'Hull Repaired & Bumper Shield Ready!',
              tone: 'emerald',
            };
            S.bannerTimer = 1.75;
            spawnParticleBurst(
              S.truckState.x,
              0.8,
              S.truckState.z,
              16,
              [0x38bdf8, 0xffdf24, 0xffffff],
              1.05,
            );
            emitHudSnapshot();
          }
        }

        if (input.spaceBufferTimer > 0) {
          input.spaceBufferTimer = Math.max(0, input.spaceBufferTimer - dt);
        }

        // Ambient Sunny & Sunset Songbird Chirps!
        if (S.currentCity.config.atmosphere !== ShiftAtmosphere.TwilightNeon) {
          S.birdChirpTimer -= dt;
          if (S.birdChirpTimer <= 0) {
            S.birdChirpTimer = 3.8 + Math.random() * 3.8;
            pokoAudio.playBirdChirp(
              S.currentCity.config.atmosphere === ShiftAtmosphere.SunnyHarbor
                ? 0.82
                : 0.6,
            );
          }
        }

        // Quick-skip flyover if player explicitly presses Enter after overview has begun
        if (
          !S.demoState.active &&
          S.countdownState.isFrozen &&
          S.countdownState.remainingSec > 0.06 &&
          S.countdownState.remainingSec < S.countdownState.totalSec - 0.3 &&
          input.keysJustPressed.has('Enter')
        ) {
          S.countdownState.remainingSec = 0.03;
        }

        const gasHeldForCountdown = S.demoState.active
          ? Boolean(demoOut?.gasForCountdown)
          : input.keysHeld.has('KeyW') ||
            input.keysHeld.has('ArrowUp') ||
            touchControls.gas ||
            input.pointerDown;

        if (S.countdownState.isFrozen || S.countdownState.stage !== null) {
          const prevRocketStatus = S.countdownState.rocketStatus;
          const cdEv = stepStartCountdown(
            S.countdownState,
            gasHeldForCountdown,
            cdDt,
          );

          if (cdEv.changedStage !== null) {
            if (
              cdEv.changedStage === 3 ||
              cdEv.changedStage === 2 ||
              cdEv.changedStage === 1 ||
              cdEv.changedStage === 0
            ) {
              pokoAudio.playCountdownBeep(cdEv.changedStage);
            }
          }

          if (S.countdownState.isFrozen) {
            // Keep living island animated while shift timer & van position stay frozen!
            stepTrafficSignals(S.currentCity.trafficSignals, dt * 0.9);
            stepPedestriansPhysics(
              S.currentCity.pedestrians,
              S.currentCity,
              S.truckState,
              dt * 0.9,
            );
            stepMovingCustomers(S.currentCity.stops, S.visualClock);

            if (cdEv.triggeredSputter) {
              pokoAudio.playEngineSputter();
              S.truckState.squashY = 1.09;
              spawnParticleBurst(
                S.truckState.x - Math.sin(S.truckState.yaw) * 0.95,
                0.35,
                S.truckState.z - Math.cos(S.truckState.yaw) * 0.95,
                6,
                [0x94a3b8, 0xcbd5e1, 0x64748b],
                0.55,
              );
            } else if (cdEv.revIntensity > 0) {
              pokoAudio.playCountdownRev(cdEv.revIntensity);
              S.truckState.squashY =
                1 + Math.sin(S.visualClock * 42) * 0.045 * cdEv.revIntensity;
              S.revExhaustAccum += dt;
              if (S.revExhaustAccum > 0.11) {
                S.revExhaustAccum = 0;
                spawnParticleBurst(
                  S.truckState.x - Math.sin(S.truckState.yaw) * 0.92,
                  0.34,
                  S.truckState.z - Math.cos(S.truckState.yaw) * 0.92,
                  S.countdownState.rocketStatus === 'primed' ? 4 : 2,
                  S.countdownState.rocketStatus === 'primed'
                    ? [0xffe524, 0xff9f1c, 0xffffff]
                    : [0xffffff, 0xe2e8f0],
                  0.52,
                );
              }
            } else {
              S.truckState.squashY += (1 - S.truckState.squashY) * Math.min(1, dt * 10);
            }
          }

          if (cdEv.justUnlockedGo) {
            if (cdEv.triggeredRocketStart) {
              applyRocketStartToTruck(S.truckState);
              S.score += ROCKET_START_POINTS;
              pokoAudio.playRocketStart();
              S.windStreakTimer = 0.9;
              S.cameraTrauma = Math.max(S.cameraTrauma, 0.28);
              spawnParticleBurst(
                S.truckState.x - Math.sin(S.truckState.yaw) * 0.95,
                0.42,
                S.truckState.z - Math.cos(S.truckState.yaw) * 0.95,
                22,
                [0xffe524, 0xff9f1c, 0x70e4ff, 0xffffff],
                1.35,
              );
              S.bannerEvent = {
                id: ++S.bannerSeq,
                label: 'Rocket Start!',
                detail: `+${ROCKET_START_POINTS} pts · Turbo Launch!`,
                tone: 'emerald',
              };
              S.bannerTimer = 1.95;
            } else if (cdEv.triggeredSputter) {
              pokoAudio.playEngineSputter();
              S.bannerEvent = {
                id: ++S.bannerSeq,
                label: 'Early Gas Sputter!',
                detail: 'Hold Gas on "1" Next Time!',
                tone: 'amber',
              };
              S.bannerTimer = 1.45;
            }
          }

          if (
            cdEv.changedStage !== null ||
            prevRocketStatus !== S.countdownState.rocketStatus ||
            cdEv.justUnlockedGo
          ) {
            emitHudSnapshot();
          }
        }

        // Simulation-level Hitstop on heavy impacts
        let simDt = S.countdownState.isFrozen ? 0 : dt;
        if (S.hitstopTimer > 0) {
          S.hitstopTimer = Math.max(0, S.hitstopTimer - dt);
          simDt = 0;
        }

        if (simDt > 0 && S.finishDelayTimer < 0) {
          S.elapsedSec += simDt;
          S.timeRemainingSec = Math.max(0, S.timeRemainingSec - simDt);

          // Countdown tick audio cue on final 10 seconds
          const ceilSec = Math.ceil(S.timeRemainingSec);
          if (ceilSec > 0 && ceilSec <= 10 && ceilSec !== S.lastTickedSecond) {
            S.lastTickedSecond = ceilSec;
            pokoAudio.playTimerTick(ceilSec <= 5);
          }

          if (S.comboTimer > 0) {
            S.comboTimer = Math.max(0, S.comboTimer - simDt);
            if (S.comboTimer <= 0) {
              S.combo = 0;
              pokoAudio.setFeverMode(false);
            }
          }

          // Google Maps Heading-Up Vehicle-Relative Controls (Keyboard + Multi-Touch Mobile Deck, or Demo Autopilot):
          let throttle = 0;
          let steer = 0;
          let wantsHorn = false;
          if (S.demoState.active && demoOut) {
            throttle = demoOut.throttle;
            steer = demoOut.steer;
            wantsHorn = demoOut.wantsHorn;
            touchControls.hornPulse = false;
          } else {
            if (input.keysHeld.has('KeyW') || input.keysHeld.has('ArrowUp') || touchControls.gas) {
              throttle += 1;
            }
            if (input.keysHeld.has('KeyS') || input.keysHeld.has('ArrowDown') || touchControls.brake) {
              throttle -= 1;
            }
            if (input.keysHeld.has('KeyA') || input.keysHeld.has('ArrowLeft')) steer -= 1;
            if (input.keysHeld.has('KeyD') || input.keysHeld.has('ArrowRight')) steer += 1;
            if (touchControls.steerTouchActive) {
              steer += touchControls.steerAnalog;
            } else {
              if (touchControls.steerLeft) steer -= 1;
              if (touchControls.steerRight) steer += 1;
            }
            throttle = Math.max(-1, Math.min(1, throttle));
            steer = Math.max(-1, Math.min(1, steer));

            wantsHorn =
              input.keysJustPressed.has('KeyQ') ||
              input.keysJustPressed.has('KeyH') ||
              touchControls.hornPulse;
            touchControls.hornPulse = false;
          }

          // Musical Horn [Q / H / Mobile Horn Button]
          if (wantsHorn) {
            const hornRes = triggerMusicalHorn(
              S.truckState,
              S.currentCity.hazards,
              S.currentCity.pedestrians,
              S.currentCity.duckCrossings,
            );
            if (hornRes) {
              pokoAudio.playMusicalHorn();
              S.truckState.squashY = 1.12;
              S.truckState.squashVel = -2.0;
              if (hornRes.calmedScooters > 0 || hornRes.hurriedDucks > 0) {
                S.bannerEvent = {
                  id: ++S.bannerSeq,
                  label:
                    hornRes.calmedScooters > 0
                      ? 'Honk! Scooters Calmed!'
                      : 'Quack! Ducks Hurrying!',
                  detail: 'Friendly Musical Horn',
                  tone: 'emerald',
                };
                S.bannerTimer = 1.45;
                emitHudSnapshot();
              }
            }
          }

          const anyTouchDeckHeld =
            touchControls.gas ||
            touchControls.brake ||
            touchControls.steerTouchActive ||
            touchControls.steerLeft ||
            touchControls.steerRight;

          // Optional pointer hold-to-steer on the road (projected relative to van heading)
          if (
            !S.demoState.active &&
            !anyTouchDeckHeld &&
            Math.abs(throttle) < 0.01 &&
            Math.abs(steer) < 0.01 &&
            input.pointerDown
          ) {
            const worldPt = screenToWorldOnRoad(input.pointerClientX, input.pointerClientY);
            if (worldPt) {
              const dx = worldPt.x - S.truckState.x;
              const dz = worldPt.z - S.truckState.z;
              const dist = Math.hypot(dx, dz);
              if (dist > 0.45) {
                const fwdX = Math.sin(S.truckState.yaw);
                const fwdZ = Math.cos(S.truckState.yaw);
                const rightX = -Math.cos(S.truckState.yaw);
                const rightZ = Math.sin(S.truckState.yaw);
                const fwdDot = (dx * fwdX + dz * fwdZ) / dist;
                const rightDot = (dx * rightX + dz * rightZ) / dist;
                throttle = fwdDot < -0.35 ? -1 : 1;
                steer = Math.max(-1, Math.min(1, rightDot * 1.8));
              }
            }
          }

          const activeStop = getActiveStop(S.currentCity.stops);
          if (activeStop?.parcelKind === ParcelKind.HotExpress) {
            S.truckState.thermalTimer = Math.max(
              0,
              S.truckState.thermalTimer - simDt,
            );
          }

          const preElig = checkDeliveryEligibility(
            S.truckState,
            activeStop,
            S.currentCity.totalGridSize,
          );

          const usedTouchDeliver = S.demoState.active
            ? Boolean(demoOut?.wantsDeliver)
            : touchControls.deliverPulse;
          touchControls.deliverPulse = false;
          if (usedTouchDeliver) {
            input.spaceBufferTimer = 0.16;
          }

          // Consume buffered Space/E/Touch-Deliver: if in Express Toss range, toss parcel! Otherwise trigger Turbo Boost!
          let wantsBoost = S.demoState.active
            ? Boolean(demoOut?.wantsBoost)
            : input.keysJustPressed.has('ShiftLeft') ||
              input.keysJustPressed.has('ShiftRight') ||
              touchControls.boostPulse;
          touchControls.boostPulse = false;
          if (input.spaceBufferTimer > 0) {
            const demoBlockEarlyFinalDrop =
              S.demoState.active &&
              S.demoState.sceneId !== 'scene5_finale_orbit' &&
              S.currentCity.stops.filter((s) => !s.delivered).length <= 1;
            if (preElig.canExpressToss && !demoBlockEarlyFinalDrop) {
              input.spaceBufferTimer = 0;
              triggerParcelDelivery(true, preElig.canBullseyeToss);
            } else if (
              !S.demoState.active &&
              (input.keysJustPressed.has('Space') || usedTouchDeliver) &&
              S.truckState.boostCooldown <= 0
            ) {
              input.spaceBufferTimer = 0;
              wantsBoost = true;
            }
          }

          // Step intersection traffic signals (or force green during Green-Wave transponder!)
          stepTrafficSignals(S.currentCity.trafficSignals, simDt);

          const physEvents = stepTruckPhysics(
            S.truckState,
            {
              throttle,
              steer,
              wantsBoost,
              wantsDrift: S.demoState.active
                ? Boolean(demoOut?.wantsDrift)
                : input.keysHeld.has('KeyC'),
            },
            S.currentCity,
            simDt,
          );

          // Leafy boulevard breeze & songbird flutter when zooming past park trees!
          if (S.truckState.speed > 6.2 && S.treeFlutterCooldown <= 0) {
            for (let ti = 0; ti < S.currentCity.trees.length; ti++) {
              const tr = S.currentCity.trees[ti];
              if (tr.variant === 'bush') continue;
              const dTree = Math.hypot(S.truckState.x - tr.x, S.truckState.z - tr.z);
              if (dTree < 2.25) {
                S.treeFlutterCooldown = 2.8;
                spawnParticleBurst(
                  tr.x,
                  1.25,
                  tr.z,
                  5,
                  [tr.tintHex, 0xfef08a, 0xffffff],
                  0.62,
                );
                if (
                  S.currentCity.config.atmosphere !== ShiftAtmosphere.TwilightNeon
                ) {
                  pokoAudio.playBirdChirp(0.78);
                }
                break;
              }
            }
          }

          if (physEvents.issuedTicket) {
            const isWrongWayTicket = physEvents.issuedTicket === 'wrong_way';
            const penaltyPts = isWrongWayTicket ? 75 : 60;
            const fineYuan = isWrongWayTicket ? 8.0 : 6.0;
            S.riderTrafficFines += fineYuan;
            S.riderReviewScore = Math.max(3.0, Number((S.riderReviewScore - 0.15).toFixed(2)));
            S.lastEarningEvent = {
              id: ++S.earningSeq,
              label: isWrongWayTicket ? '逆行违章罚款' : '闯红灯罚款',
              amountYuan: -fineYuan,
              isReward: false,
            };
            S.earningEventTimer = 2.4;

            S.score = Math.max(0, S.score - penaltyPts);
            S.timeRemainingSec = Math.max(1, S.timeRemainingSec - 3);
            S.combo = 0;
            S.comboTimer = 0;
            pokoAudio.setFeverMode(false);
            pokoAudio.playTicketCitation();
            S.cameraTrauma = Math.max(S.cameraTrauma, 0.34);
            S.hitFlashTimer = 0.07;
            S.bannerEvent = {
              id: ++S.bannerSeq,
              label: isWrongWayTicket
                ? 'Wrong-Way Ticket!'
                : 'Red-Light Ticket!',
              detail: `-${penaltyPts} pts · -¥${fineYuan.toFixed(1)}`,
              tone: 'rose',
            };
            S.bannerTimer = 2.35;
            emitHudSnapshot();
          } else if (physEvents.activatedJumpRamp) {
            S.score += 80;
            pokoAudio.playJumpLaunch();
            S.windStreakTimer = Math.max(S.windStreakTimer, 0.65);
            S.cameraTrauma = Math.max(S.cameraTrauma, 0.28);
            S.bannerEvent = {
              id: ++S.bannerSeq,
              label: 'Canal Ramp Jump!',
              detail: '+80 pts · Air Stunt!',
              tone: 'emerald',
            };
            S.bannerTimer = 1.65;
            spawnParticleBurst(
              S.truckState.x,
              0.45,
              S.truckState.z,
              14,
              [0xffdf24, 0xffffff, 0x38bdf8],
              1.1,
            );
            emitHudSnapshot();
          } else if (physEvents.pickedGreenWave) {
            S.score += 75;
            pokoAudio.playCoffeePickup();
            S.bannerEvent = {
              id: ++S.bannerSeq,
              label: 'Green-Wave Transponder!',
              detail: '+75 pts · Signals Cleared 7.5s',
              tone: 'emerald',
            };
            S.bannerTimer = 1.85;
            spawnParticleBurst(
              S.truckState.x,
              0.65,
              S.truckState.z,
              14,
              [0x10b981, 0xfef08a, 0xffffff],
              1.0,
            );
            emitHudSnapshot();
          } else if (physEvents.splashedHydrantPos) {
            S.score += 40;
            pokoAudio.playHydrantSplash();
            spawnParticleBurst(
              physEvents.splashedHydrantPos.x,
              0.55,
              physEvents.splashedHydrantPos.z,
              18,
              [0x38bdf8, 0xbae6fd, 0xffffff],
              1.25,
            );
          } else if (
            physEvents.activatedManualBoost ||
            physEvents.triggeredBoostPad
          ) {
            pokoAudio.playBoost();
            S.windStreakTimer = Math.max(S.windStreakTimer, 0.45);
            S.cameraTrauma = Math.max(S.cameraTrauma, 0.24);
            spawnParticleBurst(
              S.truckState.x,
              0.38,
              S.truckState.z,
              10,
              [0xffffff, 0x70d6ff, 0x38e4ae],
              0.85,
            );
          }

          if (physEvents.crashEvents.length > 0) {
            const wallEv = physEvents.crashEvents[0];
            fx.spawnCrashBurstEffect(wallEv, S.camYaw);
            pokoAudio.playCrashImpact(wallEv.severity, wallEv.kind);
            S.cameraTrauma = Math.max(
              S.cameraTrauma,
              wallEv.severity === 'crash' ? 0.54 : 0.3,
            );
            S.hitFlashTimer = Math.max(
              S.hitFlashTimer,
              wallEv.severity === 'crash' ? 0.08 : 0.05,
            );
            if (wallEv.severity === 'crash') {
              S.hitstopTimer = Math.max(S.hitstopTimer, 0.035);
            }
            if (!physEvents.issuedTicket) {
              S.bannerEvent = {
                id: ++S.bannerSeq,
                label: physEvents.absorbedCurbWithShock
                  ? 'Shock-Absorber Saved Cargo!'
                  : wallEv.label,
                detail: physEvents.absorbedCurbWithShock
                  ? 'Step-Van Heavy Suspension'
                  : wallEv.kind === 'gate'
                    ? 'Wait for Bridge or Hit Ramp!'
                    : 'Bumper Rebound!',
                tone: wallEv.severity === 'crash' ? 'rose' : 'amber',
              };
              S.bannerTimer = 1.45;
              emitHudSnapshot();
            }
          } else if (physEvents.absorbedCurbWithShock) {
            pokoAudio.playCurbBump();
            S.bannerEvent = {
              id: ++S.bannerSeq,
              label: 'Shock-Absorber Saved Fragile!',
              detail: 'Step-Van Heavy Suspension',
              tone: 'amber',
            };
            S.bannerTimer = 1.4;
          } else if (physEvents.hitCurb) {
            pokoAudio.playCurbBump();
          }

          // Check Roadside Drive-Thru Espresso Boost Kiosks!
          const pickedCoffee = stepCoffeeKiosks(
            S.currentCity.coffeeKiosks,
            S.truckState,
            simDt,
          );
          if (pickedCoffee) {
            S.score += 65;
            S.timeRemainingSec = Math.min(
              S.currentCity.config.timeLimitSec + 22,
              S.timeRemainingSec + 3,
            );
            recordQuestEvent('pitstops_used', 1);
            pokoAudio.playCoffeePickup();
            S.bannerEvent = {
              id: ++S.bannerSeq,
              label: 'Espresso Boost!',
              detail: '+65 pts · +3s & Full Turbo',
              tone: 'emerald',
            };
            S.bannerTimer = 1.95;
            spawnParticleBurst(
              pickedCoffee.roadX,
              0.8,
              pickedCoffee.roadZ,
              14,
              [0x34d399, 0xfde68a, 0xffffff],
              1.0,
            );
            emitHudSnapshot();
          }

          // Check Wrench Mechanic Pit-Stop Garages!
          const servicedGarage = stepMechanicGarages(
            S.currentCity.mechanicGarages,
            S.truckState,
            simDt,
          );
          if (servicedGarage) {
            S.score += 55;
            recordQuestEvent('pitstops_used', 1);
            pokoAudio.playMechanicWrench();
            S.bannerEvent = {
              id: ++S.bannerSeq,
              label: 'Wrench Pit-Stop!',
              detail: '+1 Hull HP & Bumper Shield',
              tone: 'emerald',
            };
            S.bannerTimer = 1.95;
            spawnParticleBurst(
              servicedGarage.roadX,
              0.8,
              servicedGarage.roadZ,
              16,
              [0x38bdf8, 0xffdf24, 0xffffff],
              1.05,
            );
            emitHudSnapshot();
          }

          // Step Duckling Family Crossings + Polite Yield Bonus!
          const politeDuck = stepDuckCrossings(
            S.currentCity.duckCrossings,
            S.truckState,
            simDt,
          );
          if (politeDuck) {
            S.score += 95;
            awardRunCoins(30);
            pokoAudio.playDuckQuack();
            S.bannerEvent = {
              id: ++S.bannerSeq,
              label: 'Polite Duck Yield!',
              detail: '+95 pts · +30 Coins',
              tone: 'emerald',
            };
            S.bannerTimer = 1.85;
            emitHudSnapshot();
          }

          // Step Moving Porch Customers & Rival Courier ("Zoomy Blitz")
          stepMovingCustomers(S.currentCity.stops, S.visualClock);
          const rivalStatus = stepRivalCourier(
            S.currentCity.rivalCourier,
            S.truckState,
            simDt,
          );
          if (rivalStatus === 'player_claimed' && S.currentCity.rivalCourier) {
            S.score += 250;
            awardRunCoins(75);
            S.riderRushHourBonus += 8.0;
            S.lastEarningEvent = {
              id: ++S.earningSeq,
              label: '高峰抢单王补贴',
              amountYuan: 8.0,
              isReward: true,
            };
            S.earningEventTimer = 2.4;
            pokoAudio.playSpinReward();
            S.bannerEvent = {
              id: ++S.bannerSeq,
              label: 'Beat Zoomy Blitz!',
              detail: '+250 pts · +¥8.0补贴',
              tone: 'emerald',
            };
            S.bannerTimer = 2.15;
            spawnParticleBurst(
              S.currentCity.rivalCourier.bonusDropPos.x,
              0.9,
              S.currentCity.rivalCourier.bonusDropPos.z,
              22,
              [0xffdf24, 0xa855f7, 0xffffff],
              1.3,
            );
            emitHudSnapshot();
          }

          // Auto-drop check if player drove onto the golden delivery pad (respecting Large Crate brake check!)
          const postStop = getActiveStop(S.currentCity.stops);
          const postElig = checkDeliveryEligibility(
            S.truckState,
            postStop,
            S.currentCity.totalGridSize,
          );
          const demoKeepLastStopForFinale =
            S.demoState.active &&
            S.demoState.sceneId !== 'scene5_finale_orbit' &&
            S.currentCity.stops.filter((s) => !s.delivered).length <= 1;
          if (postElig.canAutoDrop && !demoKeepLastStopForFinale) {
            triggerParcelDelivery(false, postElig.canBullseyeToss);
          }

          // Step obstacle-aware sidewalk & plaza pedestrians
          stepPedestriansPhysics(
            S.currentCity.pedestrians,
            S.currentCity,
            S.truckState,
            simDt,
          );

          // Step traffic & bridge hazards + Solid 3D Vehicle Separation, Crash Events & Ambient Car Honks!
          const hazEvents = stepHazardsAndCollisions(
            S.currentCity.hazards,
            S.truckState,
            simDt,
            S.currentCity.trafficSignals,
            S.currentCity,
          );
          for (const wh of hazEvents.startedWindups) {
            pokoAudio.playWindupTelegraph(wh.kind === HazardKind.BridgeGate);
          }
          for (const hev of hazEvents.honkEvents) {
            const distH = Math.hypot(hev.x - S.truckState.x, hev.z - S.truckState.z);
            if (distH < 34) {
              const volScale = Math.max(0.22, 1 - distH / 36);
              pokoAudio.playAmbientCarHorn(hev.isBus, volScale);
            }
          }

          let playerCrashEv: CrashEvent | null = null;
          for (const cev of hazEvents.crashEvents) {
            if (cev.involvesPlayer) {
              playerCrashEv = cev;
              fx.spawnCrashBurstEffect(cev, S.camYaw);
            } else if (
              Math.hypot(cev.x - S.truckState.x, cev.z - S.truckState.z) < 28
            ) {
              fx.spawnCrashBurstEffect(cev, S.camYaw);
              if (Math.hypot(cev.x - S.truckState.x, cev.z - S.truckState.z) < 22) {
                pokoAudio.playAiFenderBender();
              }
            }
          }

          if (hazEvents.shieldAbsorbed) {
            pokoAudio.playCrashImpact('bump', 'vehicle');
            pokoAudio.playMechanicWrench();
            S.hitFlashTimer = 0.06;
            S.cameraTrauma = Math.max(S.cameraTrauma, 0.38);
            S.bannerEvent = {
              id: ++S.bannerSeq,
              label: 'Bumper Shield Saved You!',
              detail: 'Combo & Hull Preserved',
              tone: 'amber',
            };
            S.bannerTimer = 1.75;
            spawnParticleBurst(
              S.truckState.x,
              0.7,
              S.truckState.z,
              16,
              [0x38bdf8, 0xffffff, 0xfef08a],
              1.1,
            );
            emitHudSnapshot();
          } else if (hazEvents.playerHitBy) {
            pokoAudio.playCrashImpact('crash', 'vehicle');
            pokoAudio.setFeverMode(false);
            S.hitstopTimer = 0.055; // Crisp 55ms heavy impact hitstop!
            S.hitFlashTimer = 0.095;
            S.cameraTrauma = Math.min(1.0, S.cameraTrauma + 0.72);
            S.combo = 0;
            S.comboTimer = 0;
            S.riderSpillDeduction += 4.0;
            S.riderReviewScore = Math.max(3.0, Number((S.riderReviewScore - 0.1).toFixed(2)));
            S.lastEarningEvent = {
              id: ++S.earningSeq,
              label: '碰撞洒餐赔付',
              amountYuan: -4.0,
              isReward: false,
            };
            S.earningEventTimer = 2.2;
            S.bannerEvent = {
              id: ++S.bannerSeq,
              label: playerCrashEv?.label ?? 'Traffic Crash!',
              detail: `${S.truckState.health}/${S.truckState.maxHealth} · -¥4.0赔付`,
              tone: 'rose',
            };
            S.bannerTimer = 1.8;
            emitHudSnapshot();
          } else if (playerCrashEv) {
            pokoAudio.playCrashImpact(playerCrashEv.severity, playerCrashEv.kind);
            S.hitFlashTimer = 0.07;
            S.cameraTrauma = Math.max(S.cameraTrauma, 0.44);
            if (playerCrashEv.kind === 'rival') {
              S.hitstopTimer = Math.max(S.hitstopTimer, 0.038);
            }
            S.bannerEvent = {
              id: ++S.bannerSeq,
              label: playerCrashEv.label,
              detail:
                playerCrashEv.kind === 'rival'
                  ? 'Trading Paint with Rival!'
                  : 'Solid Bumper Bounce!',
              tone: 'amber',
            };
            S.bannerTimer = 1.45;
            emitHudSnapshot();
          } else if (hazEvents.nearMissCount > 0) {
            const pts = 45 * hazEvents.nearMissCount;
            S.score += pts;
            recordQuestEvent('near_misses', hazEvents.nearMissCount);
            pokoAudio.playNearMissWhoosh();
            S.windStreakTimer = Math.max(S.windStreakTimer, 0.56);
            if (!S.bannerEvent || S.bannerTimer < 0.6) {
              S.bannerEvent = {
                id: ++S.bannerSeq,
                label: 'Slipstream Near-Miss!',
                detail: `+${pts} pts · +Turbo Charge`,
                tone: 'emerald',
              };
              S.bannerTimer = 1.25;
              emitHudSnapshot();
            }
          }

          // Express Fever rainbow exhaust sparkles + Sunshower raindrops!
          if (S.combo >= FEVER_COMBO_THRESHOLD && S.comboTimer > 0 && S.truckState.speed > 1.5) {
            S.feverTrailAccum += simDt;
            if (S.feverTrailAccum > 0.09) {
              S.feverTrailAccum = 0;
              spawnParticleBurst(
                S.truckState.x - Math.sin(S.truckState.yaw) * 0.9,
                0.35 + S.truckState.y,
                S.truckState.z - Math.cos(S.truckState.yaw) * 0.9,
                2,
                [0xffdf24, 0xff70a6, 0x38bdf8, 0x9ef01a],
                0.45,
              );
            }
          }
          if (S.currentCity.config.hasSunshower) {
            S.sunshowerAccum += simDt;
            if (S.sunshowerAccum > 0.14) {
              S.sunshowerAccum = 0;
              spawnParticleBurst(
                S.truckState.x + (Math.random() - 0.5) * 14,
                3.2,
                S.truckState.z + (Math.random() - 0.5) * 14,
                2,
                [0xbae6fd, 0x7dd3fc],
                0.35,
              );
            }
          }

          // Check Victory / Defeat Outcome
          const outcome = evaluateRunStatus(
            S.currentCity.stops,
            S.timeRemainingSec,
            S.truckState.health,
          );
          if (outcome !== OutcomeKind.None) {
            S.pendingOutcome = outcome;
            S.finishDelayTimer = outcome === OutcomeKind.Victory ? 1.55 : 0.52;
            S.victoryOrbitAngle = 0;
            S.victoryConfettiAccum = 0;
            pokoAudio.setFeverMode(false);
            if (outcome === OutcomeKind.Victory) {
              // Time-left mastery bonus + Stage Clear Confetti Finale!
              S.score += Math.round(S.timeRemainingSec * 15);
              pokoAudio.playStageClear();
              spawnParticleBurst(
                S.truckState.x,
                1.4,
                S.truckState.z,
                28,
                [0xffe524, 0xff70a6, 0x38bdf8, 0x9ef01a, 0xa855f7],
                1.45,
              );
              S.bannerEvent = {
                id: ++S.bannerSeq,
                label: 'Stage Complete!',
                detail: 'All Parcels Delivered!',
                tone: 'emerald',
              };
              S.bannerTimer = 1.6;
            } else {
              pokoAudio.playGameOver();
            }
            emitHudSnapshot();
          }
        } else if (S.finishDelayTimer >= 0) {
          S.finishDelayTimer -= dt;
          if (S.pendingOutcome === OutcomeKind.Victory) {
            // Smooth celebratory coast + Orbiting Confetti Finale!
            S.truckState.speed *= Math.exp(-4.5 * dt);
            S.victoryOrbitAngle += dt * 1.45;
            S.victoryConfettiAccum += dt;
            if (S.victoryConfettiAccum > 0.28) {
              S.victoryConfettiAccum = 0;
              spawnParticleBurst(
                S.truckState.x + (Math.random() - 0.5) * 2.4,
                1.5,
                S.truckState.z + (Math.random() - 0.5) * 2.4,
                16,
                [0xffe524, 0xff70a6, 0x38bdf8, 0x9ef01a, 0xffffff],
                1.25,
              );
            }
          }
          if (S.finishDelayTimer <= 0) {
            if (S.demoState.active) {
              // Hold celebratory confetti & Victory Orbit inside the demo until 45s completes!
              S.finishDelayTimer = 0.25;
            } else {
              S.finishDelayTimer = -1;
              clearAllInputs();
              pokoAudio.setFeverMode(false);
              const deliveredCount = S.currentCity.stops.filter(
                (s) => s.delivered,
              ).length;
              const finalScore = Math.round(S.score);
              const ceilLeft = Math.max(0, Math.ceil(S.timeRemainingSec));
              const runRewards = computeRunRewards(
                S.pendingOutcome,
                finalScore,
                deliveredCount,
                S.truckState.ticketsCount,
                ceilLeft,
              );
              if (S.pendingOutcome === OutcomeKind.OutOfTime) {
                S.riderLateDeduction += 10.0;
              }
              const finalTips = Number(
                (S.riderOnTimeBonus + S.riderHotMealTip + S.riderBullseyeTip + S.riderRushHourBonus).toFixed(1),
              );
              const finalPenalties = Number(
                (S.riderSpillDeduction + S.riderTrafficFines + S.riderLateDeduction).toFixed(1),
              );
              const finalNetYuan = Number(
                (S.riderBaseIncome + finalTips - finalPenalties).toFixed(1),
              );
              const praiseRate = Math.max(
                60,
                Math.min(100, Math.round((S.riderReviewScore / 5.0) * 100)),
              );
              const riderReceipt: RiderShiftReceipt = {
                totalOrders: deliveredCount,
                baseDeliveryFee: Number(S.riderBaseIncome.toFixed(1)),
                onTimeBonus: Number(S.riderOnTimeBonus.toFixed(1)),
                hotMealTip: Number(S.riderHotMealTip.toFixed(1)),
                bullseyeTip: Number(S.riderBullseyeTip.toFixed(1)),
                rushHourBonus: Number(S.riderRushHourBonus.toFixed(1)),
                spillDeduction: Number(S.riderSpillDeduction.toFixed(1)),
                trafficFines: Number(S.riderTrafficFines.toFixed(1)),
                lateDeduction: Number(S.riderLateDeduction.toFixed(1)),
                netEarningsYuan: finalNetYuan,
                praiseRate,
              };
              onRunFinishedRef.current({
                level: S.currentCity.config.level,
                districtName: S.currentCity.config.districtName,
                outcome: S.pendingOutcome,
                score: finalScore,
                bestScore: Math.max(bestScoreRef.current, finalScore),
                coinsEarned: runRewards.coinsEarned,
                starsEarned: runRewards.starsEarned,
                earnedSpinToken: runRewards.earnedSpinToken,
                deliveredCount,
                totalStops: S.currentCity.stops.length,
                bullseyeCount: S.bullseyeCount,
                timeRemainingSec: ceilLeft,
                elapsedSec: Math.round(S.elapsedSec),
                maxCombo: S.maxCombo,
                healthRemaining: S.truckState.health,
                ticketsCount: S.truckState.ticketsCount,
                customCity: S.currentCity.config.customCity,
                riderReceipt,
              });
            }
          }
        }

        updateCameraFraming(dt, S, cameraFramingDeps);

        // Keep minimap snapshot smooth every frame while throttling React HUD state to ~8Hz
        syncMinimapSnapshot();
        if (now - S.lastHudEmitTime > 125) {
          S.lastHudEmitTime = now;
          emitHudSnapshot();
        }
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
