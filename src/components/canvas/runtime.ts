import { createRuntimeState } from './runtimeState';
import { updateVisuals, type VisualDeps } from './visuals';
import { updateCameraFraming, type CameraFramingDeps } from './cameraFrame';
import { stepPlay, type PlayStepDeps } from './playStep';
import { createLevelScene } from './levelScene';
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
