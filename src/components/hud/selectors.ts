import { ParcelKind } from '../../game/types';
import type { HudState } from '../../game/types';

/**
 * Derived HUD metrics, split out of the GameHud render body so presentation
 * panes receive computed values instead of raw simulation state.
 */
export interface HudMetrics {
  isLowTime: boolean;
  isCriticalHealth: boolean;
  deliveryPct: number;
  boostPct: number;
  streakMultiplier: number;
  compassDeg: number;
  isPreGoCountdown: boolean;
  showMobileBanner: boolean;
  activeRewardPoints: number;
}

export function deriveHudMetrics(hud: HudState): HudMetrics {
  const isLowTime = hud.timeRemainingSec <= 12;
  const isCriticalHealth = hud.health === 1;
  const deliveryPct = Math.round(
    (hud.deliveredCount / Math.max(1, hud.totalStops)) * 100,
  );
  const boostPct = Math.round(Math.max(0, Math.min(1, hud.boostCharge)) * 100);
  const streakMultiplier = Math.max(1, hud.combo + 1);
  const compassDeg = (hud.bearingToStopRad * 180) / Math.PI;
  const isPreGoCountdown =
    hud.countdownStage !== null &&
    hud.countdownStage !== undefined &&
    hud.countdownStage > 0;
  const showMobileBanner =
    Boolean(hud.bannerEvent) &&
    hud.countdownStage === null &&
    hud.bannerEvent?.label !== 'Rocket Start!';

  const activeRewardPoints =
    hud.nextParcelKind === ParcelKind.Large
      ? 260
      : hud.nextParcelKind === ParcelKind.HotExpress
        ? hud.thermalPct > 0
          ? 320
          : 210
        : hud.nextParcelKind === ParcelKind.Fragile
          ? hud.fragileIntact
            ? 275
            : 185
          : 150;

  return {
    isLowTime,
    isCriticalHealth,
    deliveryPct,
    boostPct,
    streakMultiplier,
    compassDeg,
    isPreGoCountdown,
    showMobileBanner,
    activeRewardPoints,
  };
}
