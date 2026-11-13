import { createRuntimeState } from './runtimeState';
import { updateVisuals, type VisualDeps } from './visuals';
import { updateCameraFraming, type CameraFramingDeps } from './cameraFrame';
import { stepPlay, type PlayStepDeps } from './playStep';
import { createLevelScene } from './levelScene';
import { triggerParcelDelivery as triggerParcelDeliveryImpl, type DeliveryDeps } from './delivery';
import { createHudBridge } from './hudBridge';
import { stepTitlePreview, type TitleStepDeps } from './titleStep';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CAMERA, POOLS } from '../../config/balance';
import { pokoAudio } from '../../game/audio';
import { setActiveWeather, weatherAt, WEATHER_PROFILES } from '../../game/weather';
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

    const { syncTruckParcelStack, syncMinimapSnapshot, refreshForwardRoadPath, emitHudSnapshot } = createHudBridge(S, {
      truckRig,
      minimapSnapRef,
      onHudUpdateRef,
      bestScoreRef,
      walletCoinsRef,
    });

    const level = createLevelScene(S, {
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
    });

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



    loadLevelFnRef.current = (lvl: number, resetScore: boolean, customCfg?: LevelConfig | null) => {
      S.demoState = createDemoDirectorState();
      level.buildCityScene(lvl, resetScore, customCfg);
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
    level.buildCityScene(levelRef.current, true);

    // 5. Unified Input Listeners (held vs justPressed, Space buffer, focus-loss reset, pointer steer)
    const detachInput = attachInputListeners({
      state: input,
      canvas: renderer.domElement,
      getPhase: () => phaseRef.current,
      isDemoActive: () => S.demoState.active,
      playClick: () => pokoAudio.playUiClick(),
      onExitDemo: level.stopDemoReel,
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
    const deliveryDeps: DeliveryDeps = {
      fx,
      spawnParticleBurst,
      awardRunCoins,
      recordQuestEvent,
      emitHudSnapshot,
      refreshForwardRoadPath,
      syncTruckParcelStack,
      flyingParcels,
    };

    function triggerParcelDelivery(viaExpressToss: boolean, isBullseye: boolean = false) {
      triggerParcelDeliveryImpl(S, deliveryDeps, viaExpressToss, isBullseye);
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

    const titleStepDeps: TitleStepDeps = { camera, camLookTarget, waterPlane };
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
      startDemoReel: level.startDemoReel,
      stopDemoReel: level.stopDemoReel,
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

      // Weather beats: deterministic per level, so a long run visibly shifts.
      if (currentPhase === GamePhase.Playing && S.finishDelayTimer < 0 && !S.demoState.active) {
        S.weatherElapsedSec += cdDt;
        const nextWeather = weatherAt(
          S.currentCity ? S.currentCity.config.level : 1,
          S.weatherElapsedSec,
        );
        if (nextWeather !== S.weatherKind) {
          S.weatherKind = nextWeather;
          setActiveWeather(nextWeather);
          level.applyWeatherRig(nextWeather);
          const profile = WEATHER_PROFILES[nextWeather];
          S.bannerEvent = {
            id: ++S.bannerSeq,
            label: profile.labelZh,
            detail: profile.hintZh,
            tone: nextWeather === 'clear' ? 'emerald' : 'amber',
          };
          S.bannerTimer = 2.2;
          emitHudSnapshot();
        }
      }

      if (currentPhase === GamePhase.Title) {
        stepTitlePreview(dt, S, titleStepDeps);
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

        level.disposeLevelGroup();
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
