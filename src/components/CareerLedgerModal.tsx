/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { pokoAudio } from '../game/audio';
import {
  CAREER_MILESTONES,
  LIVERY_SPECS,
  RIDER_RANKS,
  getMilestoneProgressValue,
  getRiderRankInfo,
  normalizeCareerState,
} from '../game/career';
import {
  DailyChallenge,
  DailyProgress,
  DailyStreakState,
  STREAK_DAY_REWARDS,
  canCheckInToday,
  getDailyMedalForScore,
  getDisplayCheckInStreak,
} from '../game/dailyChallenge';
import { I18N, SupportedLanguage } from '../game/i18n';
import { TOPPER_SPECS } from '../game/progression';
import { PlayerProgression } from '../game/types';

export type CareerLedgerTab = 'career' | 'daily';

interface CareerLedgerModalProps {
  open: boolean;
  initialTab?: CareerLedgerTab;
  lang: SupportedLanguage;
  progression: PlayerProgression;
  dailyChallenge: DailyChallenge;
  dailyProgress: DailyProgress | null;
  dailyStreak: DailyStreakState;
  onExchangeEarnings: () => void;
  onClaimMilestone: (milestoneId: string) => void;
  onDailyCheckIn: () => void;
  onStartDaily: () => void;
  onClose: () => void;
}

export const CareerLedgerModal: React.FC<CareerLedgerModalProps> = ({
  open,
  initialTab = 'career',
  lang,
  progression,
  dailyChallenge,
  dailyProgress,
  dailyStreak,
  onExchangeEarnings,
  onClaimMilestone,
  onDailyCheckIn,
  onStartDaily,
  onClose,
}) => {
  const [tab, setTab] = useState<CareerLedgerTab>(initialTab);
  const [lastFlashMsg, setLastFlashMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setLastFlashMsg(null);
    }
  }, [open, initialTab]);

  if (!open) return null;

  const t = I18N[lang];
  const career = normalizeCareerState(progression.career);
  const rankInfo = getRiderRankInfo(career.careerXp);
  const unconverted = career.unconvertedYuan;
  const previewCoins = unconverted >= 0.2 ? Math.max(1, Math.round(unconverted * rankInfo.current.exchangeRate)) : 0;

  const isTodayProgress = dailyProgress && dailyProgress.dateKey === dailyChallenge.dateKey;
  const todayBestScore = isTodayProgress ? dailyProgress.bestScore : 0;
  const claimedMedals = isTodayProgress
    ? {
        bronze: Boolean(dailyProgress.claimedMedals?.bronze ?? dailyProgress.claimed),
        silver: Boolean(dailyProgress.claimedMedals?.silver),
        gold: Boolean(dailyProgress.claimedMedals?.gold),
      }
    : { bronze: false, silver: false, gold: false };
  const todayBestMedal = isTodayProgress
    ? getDailyMedalForScore(dailyChallenge, todayBestScore)
    : 'none';

  const checkInAvailable = canCheckInToday(dailyStreak);
  const displayStreakDays = getDisplayCheckInStreak(dailyStreak);
  const nextCheckInSlot = ((checkInAvailable ? displayStreakDays : Math.max(0, displayStreakDays - 1)) % 7) + 1;

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="career-ledger-heading"
    >
      <div className="pointer-events-auto arcade-panel rounded-3xl p-4 sm:p-6 w-full max-w-[600px] my-auto flex flex-col gap-3.5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="arcade-pill-brown rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-extrabold text-[#ffee1f] tracking-wide">
              {rankInfo.current.badge}{' '}
              {lang === 'zh'
                ? `段位 ${rankInfo.current.tier}/6 · ${rankInfo.current.nameZh}`
                : `Rank ${rankInfo.current.tier}/6 · ${rankInfo.current.nameEn}`}
            </div>
            <h2
              id="career-ledger-heading"
              className="arcade-stroke text-white text-xl sm:text-2xl leading-tight"
            >
              {t.careerLedgerTitle}
            </h2>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="bg-[#2b1b08] border-2 border-[#140c04] rounded-full px-3 py-1 flex items-center gap-1.5">
              <span className="inline-block w-3.5 h-3.5 rounded-full bg-[#ffe524] border border-[#140c04]" />
              <span className="arcade-stroke-sm text-[#ffe524] text-base leading-none">
                {progression.coins.toLocaleString()}
              </span>
            </div>
            <span className="text-[11px] font-extrabold text-[#6bf25c]">
              {lang === 'zh'
                ? `当前汇率 ¥1 = ${rankInfo.current.exchangeRate} 🪙`
                : `Rate: ¥1 = ${rankInfo.current.exchangeRate} Coins`}
            </span>
          </div>
        </div>

        {/* 2 Tabs */}
        <div className="grid grid-cols-2 gap-2" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'career'}
            onClick={() => {
              pokoAudio.playUiClick();
              setTab('career');
            }}
            className={`${tab === 'career' ? 'arcade-btn-gold' : 'arcade-pill-brown'} py-2.5 px-3 rounded-xl cursor-pointer text-center`}
          >
            <span className="arcade-stroke-sm text-white text-sm">
              {lang === 'zh' ? '📒 段位 · 兑换 · 涂装解锁' : '📒 Rank, ¥ Exchange & Perks'}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === 'daily'}
            onClick={() => {
              pokoAudio.playUiClick();
              setTab('daily');
            }}
            className={`${tab === 'daily' ? 'arcade-btn-gold' : 'arcade-pill-brown'} py-2.5 px-3 rounded-xl cursor-pointer text-center relative`}
          >
            <span className="arcade-stroke-sm text-white text-sm">
              {lang === 'zh' ? '🏅 每日三档奖牌 · 连胜签到' : '🏅 Daily Medals & Streak'}
            </span>
            {checkInAvailable && (
              <span
                className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#ff3b30] border-2 border-[#140c04] animate-pulse"
                aria-hidden="true"
              />
            )}
          </button>
        </div>

        {lastFlashMsg && (
          <div className="rounded-xl bg-[#2ea836] border-2 border-[#145a1a] px-3 py-2 text-center text-xs font-extrabold text-white">
            {lastFlashMsg}
          </div>
        )}

        {tab === 'career' ? (
          <div className="flex flex-col gap-3">
            {/* Rank Progression Card */}
            <div className="bg-[#fffdf5] border-[2.5px] border-[#1d1205] rounded-2xl p-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-10 h-10 rounded-xl border-2 border-[#1d1205] flex items-center justify-center text-xl shadow-xs"
                    style={{ backgroundColor: rankInfo.current.accentHex }}
                  >
                    {rankInfo.current.badge}
                  </span>
                  <div>
                    <div className="font-display text-base text-[#2b1b08]">
                      {lang === 'zh' ? rankInfo.current.nameZh : rankInfo.current.nameEn}
                    </div>
                    <div className="text-[11px] font-bold text-slate-600">
                      {lang === 'zh'
                        ? `兑换特权：¥1 可兑换 ${rankInfo.current.exchangeRate} 车库金币`
                        : `Exchange Privilege: ¥1 → ${rankInfo.current.exchangeRate} Garage Coins`}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-extrabold text-[#d97706] tabular-nums">
                    {career.careerXp} XP
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 tabular-nums">
                    {rankInfo.next
                      ? lang === 'zh'
                        ? `距「${rankInfo.next.nameZh}」还差 ${rankInfo.next.minXp - career.careerXp} XP`
                        : `${rankInfo.next.minXp - career.careerXp} XP to ${rankInfo.next.nameEn}`
                      : lang === 'zh'
                        ? '已达最高传奇段位！'
                        : 'Max Rank Reached!'}
                  </div>
                </div>
              </div>

              <div className="w-full h-3 rounded-full bg-[#e9dcc5] border border-[#1d1205]/40 overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${rankInfo.progressPct}%`,
                    backgroundColor: rankInfo.current.accentHex,
                  }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-center text-[11px]">
                <div className="rounded-xl bg-[#fff3d6] border border-[#1d1205]/20 py-1.5 px-2">
                  <div className="text-slate-600 font-bold">
                    {lang === 'zh' ? '累计送达' : 'Deliveries'}
                  </div>
                  <div className="font-extrabold text-sm text-[#2b1b08] tabular-nums">
                    {career.totalDeliveries}
                  </div>
                </div>
                <div className="rounded-xl bg-[#fff3d6] border border-[#1d1205]/20 py-1.5 px-2">
                  <div className="text-slate-600 font-bold">
                    {lang === 'zh' ? '累计外卖收入' : 'Lifetime ¥'}
                  </div>
                  <div className="font-extrabold text-sm text-[#16a34a] tabular-nums">
                    ¥{career.totalEarningsYuan.toFixed(1)}
                  </div>
                </div>
                <div className="rounded-xl bg-[#fff3d6] border border-[#1d1205]/20 py-1.5 px-2">
                  <div className="text-slate-600 font-bold">
                    {lang === 'zh' ? '零罚单安全班次' : 'Clean Shifts'}
                  </div>
                  <div className="font-extrabold text-sm text-[#2563eb] tabular-nums">
                    {career.cleanShifts}
                  </div>
                </div>
              </div>

              {/* Mini 6-rank ladder preview */}
              <div className="grid grid-cols-6 gap-1 pt-0.5">
                {RIDER_RANKS.map((r) => {
                  const unlocked = career.careerXp >= r.minXp;
                  return (
                    <div
                      key={r.id}
                      className={`rounded-lg py-1 px-1 text-center border text-[10px] font-extrabold ${
                        unlocked
                          ? 'bg-[#fef3c7] border-[#d97706] text-[#78350f]'
                          : 'bg-slate-100 border-slate-300 text-slate-400'
                      }`}
                    >
                      <div>{r.badge}</div>
                      <div>¥1={r.exchangeRate}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ¥ -> Coins Exchange Counter */}
            <div className="arcade-pill-brown rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <div className="text-xs font-extrabold text-[#ffee1f]">
                  {t.exchangeCounterTitle}
                </div>
                <div className="text-white text-sm font-bold mt-0.5">
                  {lang === 'zh'
                    ? `待结算账本余额：¥${unconverted.toFixed(1)} × ${rankInfo.current.exchangeRate} = `
                    : `Pending Pay: ¥${unconverted.toFixed(1)} × ${rankInfo.current.exchangeRate} = `}
                  <span className="text-[#ffe524] font-extrabold">{previewCoins} 🪙</span>
                </div>
                <div className="text-[11px] text-[#ffe8a3]/85 mt-0.5">
                  {lang === 'zh'
                    ? `历史已累计兑换 ${career.totalExchangedCoins.toLocaleString()} 金币 · 提升段位最高享 ¥1 = 10 🪙`
                    : `Total converted: ${career.totalExchangedCoins.toLocaleString()} Coins (max ¥1 = 10)`}
                </div>
              </div>

              <button
                type="button"
                disabled={previewCoins <= 0}
                onClick={() => {
                  pokoAudio.playCoinTossClink(0);
                  onExchangeEarnings();
                  setLastFlashMsg(
                    lang === 'zh'
                      ? `兑换成功！¥${unconverted.toFixed(1)} 已按 1:${rankInfo.current.exchangeRate} 兑换为 +${previewCoins} 车库金币！`
                      : `Exchanged ¥${unconverted.toFixed(1)} into +${previewCoins} Garage Coins!`,
                  );
                }}
                className={`${
                  previewCoins > 0
                    ? 'arcade-btn-green cursor-pointer'
                    : 'bg-stone-700 border-2 border-[#140c04] opacity-55 cursor-not-allowed'
                } px-4 py-2.5 rounded-xl shrink-0 text-center`}
              >
                <span className="arcade-stroke-sm text-white text-xs sm:text-sm whitespace-nowrap">
                  {previewCoins > 0
                    ? `${t.exchangeCta} (+${previewCoins})`
                    : lang === 'zh'
                      ? '暂无待兑换收入'
                      : 'No ¥ Pending'}
                </span>
              </button>
            </div>

            {/* Milestones unlocking Exclusive Liveries & Neon Lightbox */}
            <div className="flex flex-col gap-2">
              <div className="arcade-stroke-sm text-white text-sm px-1">
                {t.milestonesTitle}
              </div>
              {CAREER_MILESTONES.map((ms) => {
                const isClaimed = career.claimedMilestones.includes(ms.id);
                const val = getMilestoneProgressValue(career, ms.metric);
                const pct = Math.min(100, Math.round((val / ms.target) * 100));
                const ready = !isClaimed && val >= ms.target;
                const rewardName = ms.rewardLivery
                  ? lang === 'zh'
                    ? LIVERY_SPECS[ms.rewardLivery].nameZh
                    : LIVERY_SPECS[ms.rewardLivery].nameEn
                  : ms.rewardTopper
                    ? TOPPER_SPECS[ms.rewardTopper].name
                    : '';

                return (
                  <div
                    key={ms.id}
                    className="bg-[#fffdf5] border-[2.5px] border-[#1d1205] rounded-2xl p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">{ms.icon}</span>
                        <span className="font-display text-sm text-[#2b1b08] truncate">
                          {lang === 'zh' ? ms.titleZh : ms.titleEn}
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-600 mt-0.5">
                        {lang === 'zh' ? ms.descZh : ms.descEn} ·{' '}
                        <span className="text-[#b45309]">
                          {rewardName} + {ms.rewardCoins} 🪙
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-[#e9dcc5] overflow-hidden">
                          <div
                            className="h-full bg-[#16a34a]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-700 tabular-nums">
                          {Math.min(ms.target, Math.floor(val))}/{ms.target}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!ready}
                      onClick={() => {
                        pokoAudio.playSpinReward();
                        onClaimMilestone(ms.id);
                        setLastFlashMsg(
                          lang === 'zh'
                            ? `已领取并自动装备：${rewardName} (+${ms.rewardCoins} 🪙)！`
                            : `Unlocked & Equipped: ${rewardName} (+${ms.rewardCoins} Coins)!`,
                        );
                      }}
                      className={`${
                        isClaimed
                          ? 'bg-[#e2e8f0] border-2 border-slate-400 text-slate-600 cursor-default'
                          : ready
                            ? 'arcade-btn-gold cursor-pointer'
                            : 'bg-stone-600 border-2 border-[#140c04] opacity-60 cursor-not-allowed'
                      } px-3 py-2 rounded-xl shrink-0 text-center`}
                    >
                      <span
                        className={`${isClaimed ? 'text-slate-600 font-extrabold' : 'arcade-stroke-sm text-white'} text-xs`}
                      >
                        {isClaimed
                          ? lang === 'zh'
                            ? '已解锁'
                            : 'Claimed'
                          : ready
                            ? lang === 'zh'
                              ? '领取并装备'
                              : 'Claim'
                            : lang === 'zh'
                              ? '进行中'
                              : 'Locked'}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Daily Challenge Bronze / Silver / Gold Medal Card */}
            <div className="bg-[#fffdf5] border-[2.5px] border-[#1d1205] rounded-2xl p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-extrabold text-[#d97706]">
                    {lang === 'zh'
                      ? `今日赛道 (${dailyChallenge.dateKey}) · 第 ${dailyChallenge.level} 关布局`
                      : `Today's Seed (${dailyChallenge.dateKey}) · Stage ${dailyChallenge.level}`}
                  </div>
                  <div className="font-display text-base text-[#2b1b08]">
                    {lang === 'zh'
                      ? `今日最高：${todayBestScore.toLocaleString()} 分`
                      : `Today's Best: ${todayBestScore.toLocaleString()} pts`}
                    {todayBestMedal !== 'none' && (
                      <span className="ml-2 text-sm">
                        {todayBestMedal === 'gold'
                          ? '🥇'
                          : todayBestMedal === 'silver'
                            ? '🥈'
                            : '🥉'}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    pokoAudio.playUiClick();
                    onStartDaily();
                  }}
                  className="arcade-btn-green px-4 py-2 rounded-xl cursor-pointer shrink-0"
                >
                  <span className="arcade-stroke-sm text-white text-xs sm:text-sm">
                    {lang === 'zh' ? '🚀 出发冲榜' : '🚀 Play Daily'}
                  </span>
                </button>
              </div>

              {/* 3 Medal Tiers */}
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    {
                      key: 'bronze',
                      icon: '🥉',
                      name: t.bronzeMedal,
                      score: dailyChallenge.bronzeScore,
                      reward: `+${dailyChallenge.rewardCoins} 🪙`,
                      claimed: claimedMedals.bronze,
                    },
                    {
                      key: 'silver',
                      icon: '🥈',
                      name: t.silverMedal,
                      score: dailyChallenge.silverScore,
                      reward: `+${dailyChallenge.silverBonusCoins} 🪙`,
                      claimed: claimedMedals.silver,
                    },
                    {
                      key: 'gold',
                      icon: '🥇',
                      name: t.goldMedal,
                      score: dailyChallenge.goldScore,
                      reward: `+${dailyChallenge.goldBonusCoins} 🪙 +${dailyChallenge.goldSpinTokens}券`,
                      claimed: claimedMedals.gold,
                    },
                  ] as const
                ).map((tier) => (
                  <div
                    key={tier.key}
                    className={`rounded-xl border-2 p-2.5 text-center flex flex-col gap-0.5 ${
                      tier.claimed
                        ? 'bg-[#dcfce7] border-[#16a34a]'
                        : 'bg-[#fff3d6] border-[#1d1205]/25'
                    }`}
                  >
                    <div className="text-2xl">{tier.icon}</div>
                    <div className="font-extrabold text-xs text-[#2b1b08]">
                      {tier.name}
                    </div>
                    <div className="text-[11px] font-bold text-slate-600 tabular-nums">
                      {tier.score.toLocaleString()} {lang === 'zh' ? '分' : 'pts'}
                    </div>
                    <div className="text-[11px] font-extrabold text-[#d97706]">
                      {tier.reward}
                    </div>
                    <div
                      className={`text-[10px] font-extrabold mt-0.5 ${
                        tier.claimed ? 'text-[#15803d]' : 'text-slate-400'
                      }`}
                    >
                      {tier.claimed
                        ? lang === 'zh'
                          ? '✓ 已领取'
                          : '✓ Claimed'
                        : lang === 'zh'
                          ? '待解锁'
                          : 'Locked'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 7-Day Check-In & Challenge Streak Card */}
            <div className="bg-[#fffdf5] border-[2.5px] border-[#1d1205] rounded-2xl p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-display text-base text-[#2b1b08]">
                    {lang === 'zh' ? '🔥 连续签到 & 连胜奖励' : '🔥 Check-In & Challenge Streak'}
                  </div>
                  <div className="text-[11px] font-bold text-slate-600">
                    {lang === 'zh'
                      ? `已连续签到 ${displayStreakDays} 天 · 每日挑战连胜 ${dailyStreak.challengeStreakDays} 天 (连胜次日起额外 +40~200 🪙)`
                      : `Check-In Streak: ${displayStreakDays}d · Daily Clear Streak: ${dailyStreak.challengeStreakDays}d (+40~200 bonus Coins)`}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!checkInAvailable}
                  onClick={() => {
                    pokoAudio.playSpinReward();
                    onDailyCheckIn();
                    const rewardDef = STREAK_DAY_REWARDS[nextCheckInSlot - 1];
                    setLastFlashMsg(
                      lang === 'zh'
                        ? `第 ${nextCheckInSlot} 天签到成功！获得 ${rewardDef.labelZh}！`
                        : `Day ${nextCheckInSlot} Check-In claimed: ${rewardDef.labelEn}!`,
                    );
                  }}
                  className={`${
                    checkInAvailable
                      ? 'arcade-btn-gold cursor-pointer'
                      : 'bg-[#e2e8f0] border-2 border-slate-400 cursor-default'
                  } px-3.5 py-2 rounded-xl shrink-0`}
                >
                  <span
                    className={`${
                      checkInAvailable ? 'arcade-stroke-sm text-white' : 'text-slate-600 font-extrabold'
                    } text-xs sm:text-sm whitespace-nowrap`}
                  >
                    {checkInAvailable ? t.checkInBtn : t.checkedInToday}
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {STREAK_DAY_REWARDS.map((item) => {
                  const completedInCycle =
                    displayStreakDays > 0 &&
                    item.day <= ((displayStreakDays - 1) % 7) + 1 &&
                    !checkInAvailable;
                  const doneBeforeToday =
                    checkInAvailable && item.day < nextCheckInSlot;
                  const isDone = completedInCycle || doneBeforeToday;
                  const isTodayTarget = checkInAvailable && item.day === nextCheckInSlot;

                  return (
                    <div
                      key={item.day}
                      className={`rounded-xl border-2 p-1.5 text-center flex flex-col items-center justify-between gap-0.5 ${
                        isDone
                          ? 'bg-[#dcfce7] border-[#16a34a]'
                          : isTodayTarget
                            ? 'bg-[#fef3c7] border-[#f59e0b] ring-2 ring-[#fbbf24]/50'
                            : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <span className="text-[10px] font-extrabold text-slate-600">
                        {lang === 'zh' ? `第${item.day}天` : `D${item.day}`}
                      </span>
                      <span className="text-sm">
                        {isDone ? '✅' : item.day === 7 ? '🎁' : item.freeShield ? '🛡️' : '🪙'}
                      </span>
                      <span className="text-[9px] font-extrabold text-[#92400e] leading-tight">
                        {lang === 'zh' ? item.labelZh : item.labelEn}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer Close Button */}
        <button
          type="button"
          onClick={() => {
            pokoAudio.playUiClick();
            onClose();
          }}
          className="arcade-btn-cream w-full py-2.5 px-4 rounded-xl cursor-pointer text-center mt-1"
        >
          <span className="arcade-stroke-sm text-white text-sm sm:text-base">
            {t.closeModal}
          </span>
        </button>
      </div>
    </div>
  );
};
