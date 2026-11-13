import type { RuntimeState } from './runtimeState';
import type { EffectsSystem, FlyingParcel } from './effects';
import { pokoAudio } from '../../game/audio';
import { gridToWorld } from '../../game/proceduralCity';
import {
  COMBO_WINDOW_SEC,
  calculateDeliveryScore,
  getActiveStop,
} from '../../game/rules';
import { ParcelKind } from '../../game/types';
import type { QuestKind } from '../../game/types';

export interface DeliveryDeps {
  fx: EffectsSystem;
  spawnParticleBurst: EffectsSystem['spawnParticleBurst'];
  awardRunCoins: (delta: number) => void;
  recordQuestEvent: (kind: QuestKind, amount?: number) => void;
  emitHudSnapshot: () => void;
  refreshForwardRoadPath: () => void;
  syncTruckParcelStack: () => void;
  flyingParcels: FlyingParcel[];
}

export function triggerParcelDelivery(
  S: RuntimeState,
  deps: DeliveryDeps,
  viaExpressToss: boolean,
  isBullseye: boolean = false,
): void {
  const {
    fx,
    spawnParticleBurst,
    awardRunCoins,
    recordQuestEvent,
    emitHudSnapshot,
    refreshForwardRoadPath,
    syncTruckParcelStack,
    flyingParcels,
  } = deps;
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

