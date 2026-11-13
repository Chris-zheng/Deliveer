import * as THREE from 'three';
import { DemoDirectorState, createDemoDirectorState } from '../../game/demoDirector';
import { OutcomeKind } from '../../game/types';
import type { WeatherKind } from '../../game/weather';
import type { GhostSample } from '../../game/ghost';
import { generateProceduralCity } from '../../game/proceduralCity';
import {
  ParcelStackWobbleState,
  StartCountdownState,
  createInitialTruckState,
  createParcelStackWobbleState,
  createStartCountdownState,
} from '../../game/rules';
import type {
  CanalBoat,
  DuckCrossing,
  GeneratedCity,
  GreenWavePickup,
  HudBannerEvent,
  HudState,
  SidewalkPedestrian,
  SkyBalloon,
  TruckState,
  VehicleId,
} from '../../game/types';
import type {
  CitizenStopRig,
  CoffeeKioskRig,
  HazardRig,
  MechanicGarageRig,
  PersonRig,
  RivalCourierRig,
  TrafficSignalRig,
} from '../../game/meshes';
import type { SpawnedIslandBird } from './actors';

// Every mutable scalar the runtime closes over. Kept in one object so that the
// per-frame systems (canvas/simulation.ts, canvas/visuals.ts) can be plain
// functions that receive it instead of nested closures.
export function createRuntimeState({
  levelRef,
  walletCoinsRef,
  vehicleRef,
  startShieldRef,
  scene,
}: {
  levelRef: { current: number };
  walletCoinsRef: { current: number };
  vehicleRef: { current: VehicleId };
  startShieldRef: { current: boolean };
  scene: THREE.Scene;
}) {
    let levelGroup = new THREE.Group();
    scene.add(levelGroup);

    let currentCity: GeneratedCity = generateProceduralCity(levelRef.current);
    let truckState: TruckState = createInitialTruckState(
      currentCity,
      vehicleRef.current,
      startShieldRef.current,
    );
    let camYaw = truckState.yaw;
    let citizenRigs: CitizenStopRig[] = [];
    let hazardRigs: HazardRig[] = [];
    let signalRigs: TrafficSignalRig[] = [];
    let kioskRigs: CoffeeKioskRig[] = [];
    let garageRigs: MechanicGarageRig[] = [];
    let duckRigs: { data: DuckCrossing; mesh: THREE.Group }[] = [];
    let greenWaveRigs: { data: GreenWavePickup; mesh: THREE.Group }[] = [];
    let rivalRig: RivalCourierRig | null = null;
    let balloonRigs: { data: SkyBalloon; mesh: THREE.Group }[] = [];
    let pedestrianRigs: { data: SidewalkPedestrian; rig: PersonRig }[] = [];
    let boatRigs: { data: CanalBoat; mesh: THREE.Group }[] = [];
    let birdRigs: SpawnedIslandBird[] = [];
    let rampBeaconGroups: THREE.Group[] = [];
    let landmarkBeacons: { id: string; mesh: THREE.Group }[] = [];
    let discoveredLandmarkIds = new Set<string>();
    let lastPromptedStopId: string | null = null;
    let driftSparkAccum = 0;

    // Simulation state
    let score = 0;
    let combo = 0;
    let comboTimer = 0;
    let maxCombo = 0;
    let bullseyeCount = 0;
    let timeRemainingSec = currentCity.config.timeLimitSec;
    let elapsedSec = 0;
    let hitstopTimer = 0;
    let cameraTrauma = 0;
    let hitFlashTimer = 0;
    let finishDelayTimer = -1;
    let pendingOutcome: OutcomeKind = OutcomeKind.None;
    let lastHudEmitTime = 0;
    let lastPathCalcTime = -1;
    let cachedRoadPath: { x: number; z: number; yaw: number }[] = [];
    let bannerEvent: HudBannerEvent | null = null;
    let bannerTimer = 0;
    let bannerSeq = 0;
    let lastTickedSecond = -1;
    let feverTrailAccum = 0;
    let sunshowerAccum = 0;
    let countdownState: StartCountdownState = createStartCountdownState('instant');
    let parcelWobble: ParcelStackWobbleState = createParcelStackWobbleState(
      truckState.yaw,
    );
    let windStreakTimer = 0;
    let victoryOrbitAngle = 0;
    let victoryConfettiAccum = 0;
    let birdChirpTimer = 1.8;
    let treeFlutterCooldown = 0;
    let revExhaustAccum = 0;
    let lastStartedLevel = -1;
    let demoState: DemoDirectorState = createDemoDirectorState();
    let demoSandboxCoins = walletCoinsRef.current;

    // Food Delivery Rider Economy (¥)
    let riderBaseIncome = 0;
    let riderOnTimeBonus = 0;
    let riderHotMealTip = 0;
    let riderBullseyeTip = 0;
    let riderRushHourBonus = 0;
let rushPromiseSec = -1;
let weatherElapsedSec = 0;
let weatherKind: WeatherKind = 'clear';
let runElapsedSec = 0;
let ghostSampleTimer = 0;
let ghostSamples: GhostSample[] = [];
    let riderSpillDeduction = 0;
    let riderTrafficFines = 0;
    let riderLateDeduction = 0;
    let riderReviewScore = 5.0;
    let earningSeq = 0;
    let lastEarningEvent: HudState['lastEarningEvent'] = null;
    let earningEventTimer = 0;
    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let visualClock = 0;

  return {
    levelGroup,
    currentCity,
    truckState,
    camYaw,
    citizenRigs,
    hazardRigs,
    signalRigs,
    kioskRigs,
    garageRigs,
    duckRigs,
    greenWaveRigs,
    rivalRig: rivalRig as RivalCourierRig | null,
    balloonRigs,
    pedestrianRigs,
    boatRigs,
    birdRigs,
    rampBeaconGroups,
    landmarkBeacons,
    discoveredLandmarkIds,
    lastPromptedStopId: lastPromptedStopId as string | null,
    driftSparkAccum,
    score,
    combo,
    comboTimer,
    maxCombo,
    bullseyeCount,
    timeRemainingSec,
    elapsedSec,
    hitstopTimer,
    cameraTrauma,
    hitFlashTimer,
    finishDelayTimer,
    lastHudEmitTime,
    lastPathCalcTime,
    cachedRoadPath,
    bannerEvent: bannerEvent as HudBannerEvent | null,
    bannerTimer,
    bannerSeq,
    lastTickedSecond,
    feverTrailAccum,
    sunshowerAccum,
    countdownState,
    parcelWobble,
    windStreakTimer,
    victoryOrbitAngle,
    victoryConfettiAccum,
    birdChirpTimer,
    treeFlutterCooldown,
    revExhaustAccum,
    lastStartedLevel,
    demoState,
    demoSandboxCoins,
    riderBaseIncome,
    riderOnTimeBonus,
    riderHotMealTip,
    riderBullseyeTip,
    riderRushHourBonus,
    rushPromiseSec,
    weatherElapsedSec,
    weatherKind: weatherKind as WeatherKind,
runElapsedSec,
ghostSampleTimer,
ghostSamples,
    riderSpillDeduction,
    riderTrafficFines,
    riderLateDeduction,
    riderReviewScore,
    earningSeq,
    lastEarningEvent: lastEarningEvent as HudState['lastEarningEvent'],
    pendingOutcome: pendingOutcome as OutcomeKind,
    earningEventTimer,
    frameId,
    disposed,
    lastTime,
    visualClock,
  };
}

export type RuntimeState = ReturnType<typeof createRuntimeState>;
