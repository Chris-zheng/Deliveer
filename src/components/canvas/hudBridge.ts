import type { RuntimeState } from './runtimeState';
import { buildRunHudState } from './hudSnapshot';
import { getActiveStop } from '../../game/rules';
import type { HudState } from '../../game/types';
import type { ToyTruckRig } from '../../game/meshes';
import type { MinimapSnapshot } from '../hud/types';
import { computeForwardRoadPath } from './navigation';

interface HasCurrent<T> {
  current: T;
}

export interface HudBridgeDeps {
  truckRig: ToyTruckRig;
  minimapSnapRef: HasCurrent<{ current: MinimapSnapshot | null }>;
  onHudUpdateRef: HasCurrent<(state: HudState) => void>;
  bestScoreRef: HasCurrent<number>;
  walletCoinsRef: HasCurrent<number>;
}

export function createHudBridge(S: RuntimeState, deps: HudBridgeDeps) {
  const { truckRig, onHudUpdateRef, bestScoreRef, walletCoinsRef } = deps;
  const minimapSnapRef = deps.minimapSnapRef;

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

  return { syncTruckParcelStack, syncMinimapSnapshot, refreshForwardRoadPath, emitHudSnapshot };
}

