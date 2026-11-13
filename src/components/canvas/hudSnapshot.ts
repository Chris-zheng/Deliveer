import {
  BOOST_COOLDOWN_MAX_SEC,
  DRIFT_TIER1_SEC,
  DRIFT_TIER2_SEC,
  WRONG_WAY_LIMIT_SEC,
  checkDeliveryEligibility,
  getActiveStop,
  StartCountdownState,
} from '../../game/rules';
import { wrapAngleRad } from '../../game/sim/geometry';
import { gridToWorld } from '../../game/proceduralCity';
import { FEVER_COMBO_THRESHOLD } from '../../game/rules';
import {
  GeneratedCity,
  HudState,
  ParcelKind,
  TruckState,
} from '../../game/types';
import type { DemoDirectorState as DemoState } from '../../game/demoDirector';
import type { WeatherKind } from '../../game/weather';
import type { RoadPathNode } from './navigation';

export interface HudSnapshotDeps {
  currentCity: GeneratedCity;
  truckState: TruckState;
  score: number;
  combo: number;
  comboTimer: number;
  timeRemainingSec: number;
  bannerEvent: HudState['bannerEvent'];
  countdownState: StartCountdownState;
  demoState: DemoState;
  demoSandboxCoins: number;
  getCachedRoadPath: () => RoadPathNode[];
  lastEarningEvent: HudState['lastEarningEvent'];
  riderBaseIncome: number;
  riderOnTimeBonus: number;
  riderHotMealTip: number;
  riderBullseyeTip: number;
  riderRushHourBonus: number;
  riderSpillDeduction: number;
  riderTrafficFines: number;
  riderLateDeduction: number;
  riderReviewScore: number;
  walletCoins: number;
  bestScore: number;
  refreshForwardRoadPath: () => void;
  syncMinimapSnapshot: () => void;
  rushPromiseSec: number;
  weatherKind: WeatherKind;
}

/**
 * Projects the live simulation/run state into the flat HUD view model.
 *
 * Pure read: the caller owns every mutable field, this only derives presentation
 * values (bearing, thermal %, tips/penalties breakdown) for the React HUD.
 */
export function buildRunHudState(deps: HudSnapshotDeps): HudState {
  const {
    currentCity,
    truckState,
    score,
    combo,
    comboTimer,
    timeRemainingSec,
    bannerEvent,
    countdownState,
    demoState,
    demoSandboxCoins,
    getCachedRoadPath,
    lastEarningEvent,
    riderBaseIncome,
    riderOnTimeBonus,
    riderHotMealTip,
    riderBullseyeTip,
    riderRushHourBonus,
    riderSpillDeduction,
    riderTrafficFines,
    riderLateDeduction,
    riderReviewScore,
    walletCoins,
    bestScore,
    refreshForwardRoadPath,
    syncMinimapSnapshot,
    rushPromiseSec,
    weatherKind,
  } = deps;

  const activeStop = getActiveStop(currentCity.stops);
  const elig = checkDeliveryEligibility(
    truckState,
    activeStop,
    currentCity.totalGridSize,
  );
  const deliveredCount = currentCity.stops.filter((s) => s.delivered).length;
  const padPos = activeStop
    ? gridToWorld(activeStop.roadCoord, currentCity.totalGridSize)
    : { x: truckState.x, z: truckState.z };
  const dxStop = padPos.x - truckState.x;
  const dzStop = padPos.z - truckState.z;
  const distMeters = activeStop
    ? Math.max(0, Math.round(Math.hypot(dxStop, dzStop) * 4.5))
    : 0;

  // Forward-Only Turn-by-Turn Compass Bearing (Straight / Left / Right — NEVER Back!):
  let bearingRad = 0;
  if (activeStop) {
    if (getCachedRoadPath().length === 0) {
      refreshForwardRoadPath();
    }
    // Re-read after the refresh: the planner replaces the array rather than mutating it.
    const roadPath = getCachedRoadPath();
    const lookAheadNode =
      roadPath.length >= 2
        ? roadPath[Math.min(2, roadPath.length - 1)]
        : padPos;
    const navDx = lookAheadNode.x - truckState.x;
    const navDz = lookAheadNode.z - truckState.z;
    const rawWorldBearing =
      Math.hypot(navDx, navDz) > 0.25
        ? Math.atan2(navDx, navDz)
        : truckState.yaw;
    const rawRel = wrapAngleRad(truckState.yaw - rawWorldBearing);
    // Clamp strictly to [-92°, +92°] so the HUD arrow never points backward!
    const maxTurnAngle = Math.PI * 0.51;
    bearingRad = Math.max(-maxTurnAngle, Math.min(maxTurnAngle, rawRel));
  }

  const boostCharge =
    truckState.boostCooldown <= 0
      ? 1
      : Math.max(
          0,
          Math.min(1, 1 - truckState.boostCooldown / BOOST_COOLDOWN_MAX_SEC),
        );

  const thermalPct =
    activeStop?.parcelKind === ParcelKind.HotExpress &&
    truckState.thermalMaxSec > 0
      ? Math.max(
          0,
          Math.min(1, truckState.thermalTimer / truckState.thermalMaxSec),
        )
      : 0;

  syncMinimapSnapshot();

  let currentStreetName = currentCity.streetNames?.[0] ?? '';
  let currentStreetNameEn = currentStreetName;
  if (currentCity.streetSigns && currentCity.streetSigns.length > 0) {
    let bestDist = Infinity;
    for (let si = 0; si < currentCity.streetSigns.length; si++) {
      const s = currentCity.streetSigns[si];
      const d = Math.hypot(s.x - truckState.x, s.z - truckState.z);
      if (d < bestDist) {
        bestDist = d;
        currentStreetName = s.streetName;
        currentStreetNameEn = s.enName ?? s.streetName;
      }
    }
  }
  const tipsIncome = Number(
    (riderOnTimeBonus + riderHotMealTip + riderBullseyeTip + riderRushHourBonus).toFixed(1),
  );
  const penaltiesYuan = Number(
    (riderSpillDeduction + riderTrafficFines + riderLateDeduction).toFixed(1),
  );
  const netIncomeYuan = Number(
    (riderBaseIncome + tipsIncome - penaltiesYuan).toFixed(1),
  );


  return {
    level: currentCity.config.level,
    districtName: currentCity.config.districtName,
    atmosphere: currentCity.config.atmosphere,
    deliveredCount,
    totalStops: currentCity.stops.length,
    timeRemainingSec: Math.max(0, Math.ceil(timeRemainingSec)),
    score: Math.round(score),
    coins: demoState.active ? demoSandboxCoins : walletCoins,
    bestScore: Math.max(bestScore, Math.round(score)),
    combo,
    comboTimer,
    isFever: combo >= FEVER_COMBO_THRESHOLD && comboTimer > 0,
    health: truckState.health,
    maxHealth: truckState.maxHealth,
    hasBumperShield: truckState.hasBumperShield,
    greenWaveTimer: truckState.greenWaveTimer,
    nextStopIndex: activeStop
      ? activeStop.index
      : currentCity.stops.length,
    nextCustomerName: activeStop ? activeStop.customerName : 'All Delivered!',
    nextParcelLabel: activeStop ? activeStop.parcelLabel : 'Route Complete',
    nextParcelKind: activeStop ? activeStop.parcelKind : ParcelKind.Small,
    nextVipRole: activeStop ? activeStop.vipRole : 'none',
    nextArchetype: activeStop ? activeStop.archetype : 'chill',
    rushPromiseSec,
    thermalPct,
    fragileIntact: truckState.fragileIntact,
    nextStopAppearance: activeStop ? activeStop.appearance : null,
    distanceToStopMeters: distMeters,
    bearingToStopRad: bearingRad,
    canExpressToss: elig.canExpressToss,
    canBullseyeToss: elig.canBullseyeToss,
    needsBrakeForLarge: elig.needsBrakeForLarge,
    isWrongWay: truckState.isWrongWay,
    wrongWayProgress: Math.min(
      1,
      truckState.wrongWayTimer / WRONG_WAY_LIMIT_SEC,
    ),
    ticketsCount: truckState.ticketsCount,
    boostReady: truckState.boostCooldown <= 0,
    boostCharge,
    isBoosting: truckState.boostTimer > 0,
    isDrifting: truckState.isDrifting,
    driftTier: (
      truckState.isDrifting && truckState.driftChargeAccum >= DRIFT_TIER2_SEC
        ? 2
        : truckState.isDrifting && truckState.driftChargeAccum >= DRIFT_TIER1_SEC
          ? 1
          : 0
    ) as 0 | 1 | 2,
    weatherKind,
    speedKmh: Math.round(truckState.speed * 6.5),
    bannerEvent,
    countdownStage: countdownState.stage,
    rocketStartStatus: countdownState.rocketStatus,
    demoActive: demoState.active,
    demoRemainingSec: demoState.active
      ? Math.max(1, Math.ceil(demoState.durationSec - demoState.elapsedSec))
      : 0,
    customCity: currentCity.config.customCity,
    currentStreetName,
    currentStreetNameEn,
    targetStreetName: activeStop?.streetName,
    targetStreetNameEn: activeStop?.streetNameEn,
    deliveryIncomeYuan: netIncomeYuan,
    deliveryBaseIncome: Number(riderBaseIncome.toFixed(1)),
    deliveryTipsIncome: tipsIncome,
    deliveryPenaltiesYuan: penaltiesYuan,
    customerReviewScore: Number(riderReviewScore.toFixed(1)),
    lastEarningEvent,
  };
}
