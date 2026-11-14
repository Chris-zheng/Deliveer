/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { pokoAudio } from '../game/audio';
import { I18N, SupportedLanguage } from '../game/i18n';
import { GamePhase, OutcomeKind, RunSnapshot } from '../game/types';

interface StatusModalProps {
  phase: GamePhase;
  snapshot: RunSnapshot | null;
  currentLevel: number;
  lang: SupportedLanguage;
  careerRankInfo?: {
    badge: string;
    nameZh: string;
    nameEn: string;
    exchangeRate: number;
    xpGained: number;
    unconvertedYuan: number;
  };
  dailyMedalResult?: {
    medalEarned: 'none' | 'bronze' | 'silver' | 'gold';
    rewardCoins: number;
    spinTokensAwarded: number;
    streakBonusCoins: number;
  } | null;
  onResume: () => void;
  onRestart: () => void;
  onNextLevel: () => void;
  onOpenShop: () => void;
  onOpenCustomCity?: () => void;
  onOpenWorldTour?: () => void;
  onOpenCareerLedger?: () => void;
  onExchangeEarnings?: () => void;
  onBackToTitle: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  phase,
  snapshot,
  currentLevel,
  lang,
  careerRankInfo,
  dailyMedalResult,
  onResume,
  onRestart,
  onNextLevel,
  onOpenShop,
  onOpenCustomCity,
  onOpenWorldTour,
  onOpenCareerLedger,
  onExchangeEarnings,
  onBackToTitle,
}) => {
  if (phase !== GamePhase.Paused && phase !== GamePhase.GameOver) {
    return null;
  }

  const t = I18N[lang];
  const isPaused = phase === GamePhase.Paused;
  const isVictory = snapshot?.outcome === OutcomeKind.Victory;
  const isBreakdown = snapshot?.outcome === OutcomeKind.Breakdown;
  const starsEarned = snapshot?.starsEarned ?? 0;
  const isCustomCity = Boolean(snapshot?.customCity);
  const worldCityId = snapshot?.customCity?.worldCityId;
  const worldStage = snapshot?.customCity?.worldStage ?? 1;
  const canAdvanceNextStage = !isCustomCity || (Boolean(worldCityId) && worldStage < 10);
  const exchangeRate = careerRankInfo?.exchangeRate ?? 5;
  const shiftYuan = snapshot?.riderReceipt?.netEarningsYuan ?? 0;
  const shiftCoinValue = Math.max(0, Math.round(shiftYuan * exchangeRate));
  const pendingYuan = careerRankInfo?.unconvertedYuan ?? 0;
  const pendingExchangeCoins = pendingYuan >= 0.2 ? Math.max(1, Math.round(pendingYuan * exchangeRate)) : 0;

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-heading"
    >
      <div className="pointer-events-auto arcade-panel rounded-3xl p-5 sm:p-6 w-full max-w-md max-h-[92vh] overflow-y-auto flex flex-col gap-3.5">
        {isPaused ? (
          <>
            <div className="arcade-pill-brown rounded-2xl px-4 py-3 text-center">
              <div className="text-xs font-extrabold text-[var(--yellow)] tracking-wide">
                {isCustomCity
                  ? snapshot?.customCity?.districtName || t.customDistrictBadge
                  : t.stageLabel.replace('{level}', String(currentLevel))} · {lang === 'zh' ? '暂停中' : 'Paused'}
              </div>
              <h2
                id="modal-heading"
                className="arcade-stroke text-white text-2xl sm:text-3xl mt-0.5 leading-tight"
              >
                {t.pausedTitle}
              </h2>
            </div>

            <div className="bg-[var(--paper)] border-2 border-[var(--ink)] rounded-2xl p-3.5 text-xs font-semibold text-slate-800 flex flex-col gap-2">
              <div>
                <strong className="font-display text-sm text-[var(--ink-soft)]">
                  {lang === 'zh' ? '1. 驾驶与喇叭 [Q]：' : '1. Controls & Horn [Q]:'}
                </strong>{' '}
                {lang === 'zh'
        ? 'W/↑ 前进 · S/↓ 刹车，停住后继续按即倒车 · A/D 转向 · Q 按喇叭疏散快件！'
        : 'W/↑ Drive · S/↓ Brake, hold again to reverse · A/D Turn · Q Horn calms scooters!'}
              </div>
              <div>
                <strong className="font-display text-sm text-[var(--ink-soft)]">
                  {lang === 'zh' ? '2. 右侧通行与维修站：' : '2. Right Lane & Pit-Stops:'}
                </strong>{' '}
                {lang === 'zh'
                  ? '时刻靠右行，飞跃水上跳台避开闭桥，进站喝咖啡冲刺或修车！'
                  : 'Keep Right, hit Jump Ramps over canal gates, and visit Espresso/Wrench bays!'}
              </div>
              <div>
                <strong className="font-display text-sm text-[var(--ink-soft)]">
                  {lang === 'zh' ? '3. 投掷与包裹 [空格]：' : '3. Bullseye & Parcels [Space]:'}
                </strong>{' '}
                {lang === 'zh'
                  ? '正中金色靶心奖 2x 连击，热食急件要快送，大件包裹请减速停车！'
                  : 'Hit Gold Bullseye for 2x Combo, deliver Hot Thermal bags fast, and brake for Large Crates!'}
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  pokoAudio.playUiClick();
                  onResume();
                }}
                className="arcade-btn-gold w-full py-3 px-5 rounded-2xl cursor-pointer whitespace-nowrap"
              >
                <span className="arcade-stroke text-white text-lg sm:text-xl">
                  {t.resume}
                </span>
              </button>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    pokoAudio.playUiClick();
                    onOpenShop();
                  }}
                  className="arcade-btn-green py-2.5 px-4 rounded-2xl cursor-pointer whitespace-nowrap"
                >
                  <span className="arcade-stroke-sm text-white text-sm sm:text-base">
                    {t.garageShop}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    pokoAudio.playUiClick();
                    onRestart();
                  }}
                  className="arcade-btn-cream py-2.5 px-4 rounded-2xl cursor-pointer whitespace-nowrap"
                >
                  <span className="arcade-stroke-sm text-white text-sm sm:text-base">
                    {t.restart}
                  </span>
                </button>
              </div>

              {onOpenCustomCity && (
                <button
                  type="button"
                  onClick={() => {
                    pokoAudio.playUiClick();
                    onOpenCustomCity();
                  }}
                  className="arcade-btn-cream w-full py-2.5 px-4 rounded-2xl cursor-pointer whitespace-nowrap"
                >
                  <span className="arcade-stroke-sm text-white text-base">
                    <MapIcon className="mr-1" />{t.customMapBtn}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  pokoAudio.playUiClick();
                  onBackToTitle();
                }}
                className="arcade-btn-cream w-full py-2.5 px-5 rounded-2xl cursor-pointer whitespace-nowrap"
              >
                <span className="arcade-stroke-sm text-white text-base sm:text-lg">
                  {t.welcomeScreen}
                </span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="arcade-pill-brown rounded-2xl px-4 py-3 text-center">
              <div className="text-xs font-extrabold text-[var(--yellow)] tracking-wide">
                {isCustomCity
                  ? snapshot?.customCity?.districtName || t.customDistrictBadge
                  : `${t.stageLabel.replace('{level}', String(snapshot?.level ?? currentLevel))} · ${snapshot?.districtName ?? 'Island Quarter'}`}
              </div>
              <h2
                id="modal-heading"
                className="arcade-stroke text-white text-2xl sm:text-3xl mt-0.5 leading-tight"
              >
                {isVictory
                  ? t.victoryTitle
                  : isBreakdown
                    ? t.breakdownTitle
                    : t.timeUpTitle}
              </h2>

              {/* 3 Golden Mastery Stars */}
              <div
                className="flex items-center justify-center gap-2 mt-2"
                aria-label={`${starsEarned} of 3 mastery stars earned`}
              >
                {[1, 2, 3].map((st) => (
                  <svg
                    key={st}
                    viewBox="0 0 36 36"
                    className="w-8 h-8 drop-shadow-sm"
                    aria-hidden="true"
                  >
                    <path
                      d="M18 3l4.6 8.9 9.8 1.6-7 7.1 1.6 9.8L18 25.9 9 30.4l1.6-9.8-7-7.1 9.8-1.6L18 3z"
                      fill={st <= starsEarned ? 'var(--yellow)' : 'var(--ink-soft)'}
                      stroke="#140c04"
                      strokeWidth="2.6"
                      strokeLinejoin="round"
                    />
                  </svg>
                ))}
              </div>
            </div>

            {/* Stat Tiles */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="arcade-pill-brown rounded-2xl p-2.5">
                <div className="text-xs font-extrabold text-[var(--yellow)]">
                  {isVictory ? t.timeRemaining : t.delivered}
                </div>
                <div className="arcade-stroke-sm text-white text-xl mt-0.5">
                  {isVictory
                    ? `${snapshot?.timeRemainingSec ?? 0}s`
                    : `${snapshot?.deliveredCount ?? 0}/${snapshot?.totalStops ?? 0}`}
                </div>
              </div>

              <div className="arcade-pill-brown rounded-2xl p-2.5">
                <div className="text-xs font-extrabold text-[var(--yellow)]">
                  {t.finalScore}
                </div>
                <div className="arcade-stroke-sm text-[var(--yellow)] text-xl mt-0.5">
                  {(snapshot?.score ?? 0).toLocaleString()}
                </div>
              </div>

              <div className="arcade-pill-brown rounded-2xl p-2.5">
                <div className="text-xs font-extrabold text-[var(--green)]">
                  {t.coinsEarned}
                </div>
                <div className="arcade-stroke-sm text-[var(--yellow)] text-xl mt-0.5">
                  +{snapshot?.coinsEarned ?? 0}
                </div>
              </div>
            </div>

            {snapshot?.riderReceipt && (
              <div className="bg-[var(--paper)] border-2 border-[var(--ink)] rounded-2xl p-3 text-xs text-slate-800 flex flex-col gap-1.5">
                <div className="flex items-center justify-between border-b border-[var(--ink)]/15 pb-1.5">
                  <span className="font-display text-sm text-[var(--ink-soft)]">
                    <TruckIcon className="mr-1" />{lang === 'zh' ? '骑手本趟收入账单' : 'Rider Shift Receipt'}
                  </span>
                  <span className="font-extrabold text-[var(--orange)]">
                    {lang === 'zh'
                      ? `好评率 ${snapshot.riderReceipt.praiseRate}%`
                      : `Rating ${snapshot.riderReceipt.praiseRate}%`}
                  </span>
                </div>
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-600">
                    {lang === 'zh'
                      ? `基础配送费 (${snapshot.riderReceipt.totalOrders}单)`
                      : `Base Delivery Pay (${snapshot.riderReceipt.totalOrders})`}
                  </span>
                  <span className="text-slate-900 tabular-nums">
                    +¥{snapshot.riderReceipt.baseDeliveryFee.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-600">
                    {lang === 'zh'
                      ? '准时/保温/精准/抢单奖励'
                      : 'On-Time, Thermal & Rush Bonuses'}
                  </span>
                  <span className="text-[var(--green)] tabular-nums">
                    +¥
                    {(
                      snapshot.riderReceipt.onTimeBonus +
                      snapshot.riderReceipt.hotMealTip +
                      snapshot.riderReceipt.bullseyeTip +
                      snapshot.riderReceipt.rushHourBonus
                    ).toFixed(1)}
                  </span>
                </div>
                {(snapshot.riderReceipt.spillDeduction > 0 ||
                  snapshot.riderReceipt.trafficFines > 0 ||
                  snapshot.riderReceipt.lateDeduction > 0) && (
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-[var(--red)]">
                      {lang === 'zh'
                        ? '违章罚款 / 餐损 / 超时扣款'
                        : 'Fines, Spill & Late Deductions'}
                    </span>
                    <span className="text-[var(--red)] tabular-nums">
                      -¥
                      {(
                        snapshot.riderReceipt.spillDeduction +
                        snapshot.riderReceipt.trafficFines +
                        snapshot.riderReceipt.lateDeduction
                      ).toFixed(1)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-[var(--ink)]/15 pt-1.5 font-extrabold text-sm">
                  <span className="text-[var(--ink-soft)]">
                    {lang === 'zh'
                      ? (<>本趟实得净收入 (当前 ¥1={exchangeRate} <CoinIcon />)</>)
                      : `Net Pay (Rank Rate ¥1=${exchangeRate} Coins)`}
                  </span>
                  <span
                    className={`tabular-nums ${
                      snapshot.riderReceipt.netEarningsYuan >= 0
                        ? 'text-[var(--green)]'
                        : 'text-[var(--red)]'
                    }`}
                  >
                    ¥{snapshot.riderReceipt.netEarningsYuan.toFixed(1)} (≈{shiftCoinValue}<CoinIcon />)
                  </span>
                </div>

                {careerRankInfo && (
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-dashed border-[var(--ink)]/15">
                    <div className="text-xs font-bold text-[var(--orange)]">
                      {careerRankInfo.badge}{' '}
                      {lang === 'zh' ? careerRankInfo.nameZh : careerRankInfo.nameEn}
                      {careerRankInfo.xpGained > 0 && ` (+${careerRankInfo.xpGained} XP)`}
                    </div>
                    {onExchangeEarnings && pendingExchangeCoins > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          pokoAudio.playCoinTossClink(0);
                          onExchangeEarnings();
                        }}
                        className="arcade-btn-green px-2.5 py-1 rounded-lg cursor-pointer shrink-0"
                      >
                        <span className="arcade-stroke-sm text-white text-xs">
                          {lang === 'zh'
                            ? (<>立即兑换 ¥{pendingYuan.toFixed(1)} → +{pendingExchangeCoins}<CoinIcon /></>)
                            : `Convert +${pendingExchangeCoins} Coins`}
                        </span>
                      </button>
                    ) : (
                      <span className="text-xs font-extrabold text-[var(--green)]">
                        {lang === 'zh' ? '✓ 已全部兑换为金币' : '✓ Converted'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {dailyMedalResult && (
              <div className="arcade-pill-brown rounded-2xl px-3.5 py-2 flex items-center justify-between gap-2">
                <div className="text-xs font-extrabold text-[var(--yellow)]">
                  {dailyMedalResult.medalEarned === 'gold'
                    ? (<><MedalIcon tier="gold" className="mr-1" />{lang === 'zh' ? '每日挑战 · 夺得金牌！' : 'Daily Challenge: GOLD!'}</>)
                    : dailyMedalResult.medalEarned === 'silver'
                      ? (<><MedalIcon tier="silver" className="mr-1" />{lang === 'zh' ? '每日挑战 · 夺得银牌！' : 'Daily Challenge: SILVER!'}</>)
                      : dailyMedalResult.medalEarned === 'bronze'
                        ? (<><MedalIcon tier="bronze" className="mr-1" />{lang === 'zh' ? '每日挑战 · 夺得铜牌！' : 'Daily Challenge: BRONZE!'}</>)
                        : lang === 'zh'
                          ? (<><CalendarIcon className="mr-1" />每日挑战完成（再冲高分夺牌！）</>)
                          : (<><CalendarIcon className="mr-1" />Daily Run Complete</>)}
                </div>
                <div className="text-xs font-extrabold text-[var(--green)] tabular-nums">
                  {dailyMedalResult.rewardCoins > 0 && (<>+{dailyMedalResult.rewardCoins}<CoinIcon /> </>)}
                  {dailyMedalResult.streakBonusCoins > 0 && (
                    <>
                      +{dailyMedalResult.streakBonusCoins}
                      <FlameIcon />{' '}
                    </>
                  )}
                  {dailyMedalResult.spinTokensAwarded > 0 && `+${dailyMedalResult.spinTokensAwarded}券`}
                </div>
              </div>
            )}

            <div className="text-center text-xs font-extrabold text-[var(--ink-soft)] -mt-0.5">
              {lang === 'zh' ? '违章记录：' : 'Traffic Record: '}
              {(snapshot?.ticketsCount ?? 0) === 0 ? (
                <span className="text-[var(--ink-soft)]">
                  {lang === 'zh' ? '规范文明驾驶 · 0 罚单奖励' : 'Clean Driving · 0 Tickets'}
                </span>
              ) : (
                <span className="text-[var(--red)]">
                  {lang === 'zh'
                    ? `收到 ${snapshot?.ticketsCount} 张交通罚单`
                    : `${snapshot?.ticketsCount} Tickets Issued`}
                </span>
              )}
              {snapshot?.earnedSpinToken ? (
                <span className="text-[var(--blue)]">
                  {lang === 'zh' ? ' · +1 抽奖券！' : ' · +1 Spin Token!'}
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-2.5">
              {isVictory ? (
                <>
                  {canAdvanceNextStage && (
                    <button
                      type="button"
                      data-start="true"
                      onClick={() => {
                        pokoAudio.playUiClick();
                        onNextLevel();
                      }}
                      className="arcade-btn-gold w-full py-3.5 px-5 rounded-2xl cursor-pointer whitespace-nowrap"
                    >
                      <span className="arcade-stroke text-white text-lg sm:text-xl">
                        {t.nextStage} ({worldCityId ? `STAGE ${worldStage + 1}/10` : `STAGE ${(snapshot?.level ?? currentLevel) + 1}`})
                      </span>
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        pokoAudio.playUiClick();
                        onOpenShop();
                      }}
                      className="arcade-btn-green py-2.5 px-4 rounded-2xl cursor-pointer whitespace-nowrap"
                    >
                      <span className="arcade-stroke-sm text-white text-sm sm:text-base">
                        {t.garageShop}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        pokoAudio.playUiClick();
                        onBackToTitle();
                      }}
                      className="arcade-btn-cream py-2.5 px-4 rounded-2xl cursor-pointer whitespace-nowrap"
                    >
                      <span className="arcade-stroke-sm text-white text-sm sm:text-base">
                        {t.welcomeScreen}
                      </span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    data-start="true"
                    onClick={() => {
                      pokoAudio.playUiClick();
                      onRestart();
                    }}
                    className="arcade-btn-gold w-full py-3.5 px-5 rounded-2xl cursor-pointer whitespace-nowrap"
                  >
                    <span className="arcade-stroke text-white text-lg sm:text-xl">
                      {t.tryAgain}
                    </span>
                  </button>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        pokoAudio.playUiClick();
                        onOpenShop();
                      }}
                      className="arcade-btn-green py-2.5 px-4 rounded-2xl cursor-pointer whitespace-nowrap"
                    >
                      <span className="arcade-stroke-sm text-white text-sm sm:text-base">
                        {t.garageShop}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        pokoAudio.playUiClick();
                        onBackToTitle();
                      }}
                      className="arcade-btn-cream py-2.5 px-4 rounded-2xl cursor-pointer whitespace-nowrap"
                    >
                      <span className="arcade-stroke-sm text-white text-sm sm:text-base">
                        {t.welcomeScreen}
                      </span>
                    </button>
                  </div>
                </>
              )}

              {onOpenCareerLedger && (
                <button
                  type="button"
                  onClick={() => {
                    pokoAudio.playUiClick();
                    onOpenCareerLedger();
                  }}
                  className="arcade-btn-cream w-full py-2.5 px-4 rounded-2xl cursor-pointer whitespace-nowrap"
                >
                  <span className="arcade-stroke-sm text-white text-base">
                    {t.careerLedgerBtn}
                  </span>
                </button>
              )}

              {onOpenWorldTour && (
                <button
                  type="button"
                  onClick={() => {
                    pokoAudio.playUiClick();
                    onOpenWorldTour();
                  }}
                  className="arcade-btn-cream w-full py-2.5 px-4 rounded-2xl cursor-pointer whitespace-nowrap"
                >
                  <span className="arcade-stroke-sm text-white text-base">
                    {t.worldTourBtn}
                  </span>
                </button>
              )}

              {onOpenCustomCity && (
                <button
                  type="button"
                  onClick={() => {
                    pokoAudio.playUiClick();
                    onOpenCustomCity();
                  }}
                  className="arcade-btn-cream w-full py-2.5 px-4 rounded-2xl cursor-pointer whitespace-nowrap"
                >
                  <span className="arcade-stroke-sm text-white text-base">
                    <MapIcon className="mr-1" />{t.customMapBtn}
                  </span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
import { CalendarIcon, CoinIcon, FlameIcon, MapIcon, MedalIcon, TruckIcon } from './hud/icons';
