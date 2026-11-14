/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { pokoAudio } from '../game/audio';
import { I18N, SupportedLanguage } from '../game/i18n';
import { LIVERY_SPECS } from '../game/career';
import {
  SPIN_COST_COINS,
  SPIN_WHEEL_SLICES,
  SpinWheelSlice,
  TOPPER_SPECS,
  VEHICLE_SPECS,
} from '../game/progression';
import { LiveryId, PlayerProgression, TopperId, UpgradeTrack, VehicleId } from '../game/types';
import {
  MAX_UPGRADE_LEVEL,
  nextUpgradeTier,
  normalizeUpgradeLevels,
  UPGRADE_TRACK_ORDER,
  UPGRADE_TRACKS,
} from '../game/upgrades';

interface GarageShopModalProps {
  open: boolean;
  progression: PlayerProgression;
  lang?: SupportedLanguage;
  onSelectOrBuyVehicle: (id: VehicleId) => void;
  onSelectOrBuyTopper: (id: TopperId) => void;
  onSelectOrBuyLivery?: (id: LiveryId) => void;
  onSpinWheel: () => { slice: SpinWheelSlice | null; usedToken: boolean };
  onPurchaseUpgrade: (track: UpgradeTrack) => boolean;
  onClose: () => void;
}

type ShopTab = 'fleet' | 'toppers' | 'liveries' | 'upgrades' | 'spin';

const VEHICLE_ZH: Record<VehicleId, { name: string; tagline: string }> = {
  [VehicleId.ClassicVan]: {
    name: '经典小黄货车',
    tagline: '操控均衡 · 3格耐久底盘',
  },
  [VehicleId.KeiTruck]: {
    name: '薄荷意式轻卡',
    tagline: '90°漂移神车 · +12% 起步加速',
  },
  [VehicleId.VespaTrike]: {
    name: '涡轮意式三轮机车',
    tagline: '+14% 最高极速 · +1.6米投掷射程',
  },
  [VehicleId.ArmoredVan]: {
    name: '重型防弹押运车',
    tagline: '5格超强耐久 · 自带易碎品避震器',
  },
};

const TOPPER_ZH: Record<TopperId, { name: string; tagline: string }> = {
  [TopperId.Beacon]: {
    name: '琥珀调度警示灯',
    tagline: '标准快递车顶警示灯条',
  },
  [TopperId.RubberDuck]: {
    name: '招财黄色小鸭',
    tagline: '带来幸运的海港小鸭车头伴侣',
  },
  [TopperId.EspressoCup]: {
    name: '旋转意式咖啡杯',
    tagline: '提神醒脑的旋转咖啡招牌',
  },
  [TopperId.PartyBalloons]: {
    name: '马卡龙节日气球',
    tagline: '随风摇曳的三色轻盈氢气球',
  },
  [TopperId.NeonLightbox]: {
    name: '幻夜霓虹灯箱',
    tagline: '双色发光快递灯箱 · 里程碑或商城解锁',
  },
};

const WHEEL_ZH: Record<number, { label: string; detail: string }> = {
  0: { label: '+150 金币', detail: '快递小费袋' },
  1: { label: '保险杠护盾', detail: '下趟发车自带免费护盾 + 80金币' },
  2: { label: '+300 金币', detail: '特快路线奖金' },
  3: { label: '+180 金币', detail: '海港印章赏金' },
  4: { label: '+500 头奖金库！', detail: '特工黄金调度金库' },
  5: { label: '护盾 + 200 金币', detail: '防弹起步强化包' },
};

export const GarageShopModal: React.FC<GarageShopModalProps> = ({
  open,
  progression,
  lang = 'zh',
  onSelectOrBuyVehicle,
  onSelectOrBuyTopper,
  onSelectOrBuyLivery,
  onSpinWheel,
  onPurchaseUpgrade,
  onClose,
}) => {
  const [tab, setTab] = useState<ShopTab>('fleet');
  const [wheelDeg, setWheelDeg] = useState<number>(0);
  const [spinning, setSpinning] = useState<boolean>(false);
  const [lastSpinReward, setLastSpinReward] = useState<SpinWheelSlice | null>(
    null,
  );

  if (!open) return null;

  const t = I18N[lang];
  const canSpin =
    !spinning &&
    (progression.spinTokens > 0 || progression.coins >= SPIN_COST_COINS);

  const handleTriggerSpin = () => {
    if (!canSpin) return;
    pokoAudio.playUiClick();
    const res = onSpinWheel();
    if (!res.slice) return;
    setSpinning(true);
    setLastSpinReward(null);
    const sliceCenterDeg = res.slice.index * 60 + 30;
    const nextRot =
      wheelDeg + 1080 + ((360 - sliceCenterDeg - (wheelDeg % 360) + 360) % 360);
    setWheelDeg(nextRot);
    window.setTimeout(() => {
      setSpinning(false);
      setLastSpinReward(res.slice);
      pokoAudio.playSpinReward();
    }, 850);
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="garage-shop-heading"
    >
      <div className="pointer-events-auto arcade-panel rounded-3xl p-4 sm:p-6 w-full max-w-[560px] my-auto flex flex-col gap-3.5">
        {/* Header Banner + Coin / Spin Token Balance */}
        <div className="arcade-pill-brown rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-extrabold text-[#ffee1f] tracking-wide">
              {lang === 'zh' ? '特工装备工坊 · 载具改装' : 'Courier Depot & Customization'}
            </div>
            <h2
              id="garage-shop-heading"
              className="arcade-stroke text-white text-2xl sm:text-3xl leading-tight"
            >
              {t.garageTitle}
            </h2>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="bg-[#2b1b08] border-2 border-[#140c04] rounded-full px-3 py-1 flex items-center gap-1.5">
              <span className="inline-block w-3.5 h-3.5 rounded-full bg-[#ffe524] border border-[#140c04]" />
              <span
                className="arcade-stroke-sm text-[#ffe524] text-base leading-none"
                aria-label={`${progression.coins} coins available`}
              >
                {progression.coins.toLocaleString()}
              </span>
            </div>
            {progression.spinTokens > 0 && (
              <span className="text-[11px] font-extrabold text-[#6bf25c]">
                {progression.spinTokens} {lang === 'zh' ? '张免费转盘抽奖券！' : 'Free Spin Tokens!'}
              </span>
            )}
          </div>
        </div>

        {/* 5 Category Tabs */}
        <div
          className="grid grid-cols-5 gap-1.5"
          role="tablist"
          aria-label="Shop categories"
        >
          {(
            [
              { id: 'fleet', label: t.vehicleTab },
              { id: 'toppers', label: t.topperTab },
              { id: 'liveries', label: t.paintTab },
              { id: 'upgrades', label: lang === 'zh' ? '升级' : 'Upgrades' },
              { id: 'spin', label: t.wheelTab },
            ] as { id: ShopTab; label: string }[]
          ).map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  pokoAudio.playUiClick();
                  setTab(item.id);
                }}
                className={`${
                  active ? 'arcade-btn-gold' : 'arcade-pill-brown'
                } py-2 px-1 rounded-xl cursor-pointer text-center relative`}
              >
                <span className="arcade-stroke-sm text-white text-[11px] sm:text-xs">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Unlockable Fleet Vehicles */}
        {tab === 'fleet' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(Object.values(VEHICLE_SPECS) as (typeof VEHICLE_SPECS)[VehicleId][]).map(
              (v) => {
                const owned = progression.unlockedVehicles.includes(v.id);
                const equipped = progression.selectedVehicle === v.id;
                const canAfford = progression.coins >= v.costCoins;
                const vZh = VEHICLE_ZH[v.id];
                const displayName = lang === 'zh' ? vZh.name : v.name;
                const displayTag = lang === 'zh' ? vZh.tagline : v.tagline;

                return (
                  <div
                    key={v.id}
                    className="arcade-pill-brown rounded-2xl p-3 flex flex-col justify-between gap-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="arcade-stroke-sm text-white text-base leading-snug">
                          {displayName}
                        </div>
                        <div className="text-[11px] font-bold text-[#ffe8a3] mt-0.5">
                          {displayTag}
                        </div>
                      </div>
                      <span
                        className="w-5 h-5 rounded-lg border-2 border-[#140c04] shrink-0 mt-0.5"
                        style={{ backgroundColor: v.accentHex }}
                        aria-hidden="true"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={!owned && !canAfford}
                      onClick={() => {
                        pokoAudio.playUiClick();
                        onSelectOrBuyVehicle(v.id);
                      }}
                      className={`${
                        equipped
                          ? 'arcade-btn-green'
                          : owned
                            ? 'arcade-btn-cream'
                            : canAfford
                              ? 'arcade-btn-gold'
                              : 'bg-stone-700 border-2 border-[#140c04] opacity-60 cursor-not-allowed'
                      } w-full py-2 px-3 rounded-xl cursor-pointer text-center`}
                    >
                      <span className="arcade-stroke-sm text-white text-sm">
                        {equipped
                          ? t.equipped
                          : owned
                            ? t.equip
                            : `${t.buyFor} · ${v.costCoins}`}
                      </span>
                    </button>
                  </div>
                );
              },
            )}
          </div>
        )}

        {/* Tab 2: 3D Roof Toppers */}
        {tab === 'toppers' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(Object.values(TOPPER_SPECS) as (typeof TOPPER_SPECS)[TopperId][]).map(
              (tp) => {
                const owned = progression.unlockedToppers.includes(tp.id);
                const equipped = progression.selectedTopper === tp.id;
                const canAfford = progression.coins >= tp.costCoins;
                const tpZh = TOPPER_ZH[tp.id];
                const displayName = lang === 'zh' ? tpZh.name : tp.name;
                const displayTag = lang === 'zh' ? tpZh.tagline : tp.tagline;

                return (
                  <div
                    key={tp.id}
                    className="arcade-pill-brown rounded-2xl p-3 flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      <div className="arcade-stroke-sm text-white text-base leading-snug">
                        {displayName}
                      </div>
                      <div className="text-[11px] font-bold text-[#ffe8a3] mt-0.5">
                        {displayTag}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!owned && !canAfford}
                      onClick={() => {
                        pokoAudio.playUiClick();
                        onSelectOrBuyTopper(tp.id);
                      }}
                      className={`${
                        equipped
                          ? 'arcade-btn-green'
                          : owned
                            ? 'arcade-btn-cream'
                            : canAfford
                              ? 'arcade-btn-gold'
                              : 'bg-stone-700 border-2 border-[#140c04] opacity-60 cursor-not-allowed'
                      } w-full py-2 px-3 rounded-xl cursor-pointer text-center`}
                    >
                      <span className="arcade-stroke-sm text-white text-sm">
                        {equipped
                          ? t.equipped
                          : owned
                            ? t.equip
                            : `${t.buyFor} · ${tp.costCoins}`}
                      </span>
                    </button>
                  </div>
                );
              },
            )}
          </div>
        )}

        {/* Tab 3: Exclusive Paint Liveries */}
        {tab === 'liveries' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(Object.values(LIVERY_SPECS) as (typeof LIVERY_SPECS)[LiveryId][]).map(
              (lv) => {
                const owned = (progression.unlockedLiveries ?? [LiveryId.Standard]).includes(lv.id);
                const equipped = (progression.selectedLivery ?? LiveryId.Standard) === lv.id;
                const displayName = lang === 'zh' ? lv.nameZh : lv.nameEn;
                const displayTag = lang === 'zh' ? lv.taglineZh : lv.taglineEn;

                return (
                  <div
                    key={lv.id}
                    className="arcade-pill-brown rounded-2xl p-3 flex flex-col justify-between gap-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="arcade-stroke-sm text-white text-base leading-snug">
                          {displayName}
                        </div>
                        <div className="text-[11px] font-bold text-[#ffe8a3] mt-0.5">
                          {displayTag}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
                        <span
                          className="w-4 h-4 rounded-l-md border-2 border-[#140c04]"
                          style={{ backgroundColor: `#${lv.cabHex.toString(16).padStart(6, '0')}` }}
                          aria-hidden="true"
                        />
                        <span
                          className="w-4 h-4 rounded-r-md border-2 border-l-0 border-[#140c04]"
                          style={{ backgroundColor: `#${lv.stripeHex.toString(16).padStart(6, '0')}` }}
                          aria-hidden="true"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!owned}
                      onClick={() => {
                        pokoAudio.playUiClick();
                        onSelectOrBuyLivery?.(lv.id);
                      }}
                      className={`${
                        equipped
                          ? 'arcade-btn-green'
                          : owned
                            ? 'arcade-btn-cream'
                            : 'bg-stone-700 border-2 border-[#140c04] opacity-70 cursor-not-allowed'
                      } w-full py-2 px-3 rounded-xl cursor-pointer text-center`}
                    >
                      <span className="arcade-stroke-sm text-white text-xs sm:text-sm">
                        {equipped
                          ? t.equipped
                          : owned
                            ? t.equip
                            : lang === 'zh'
                              ? '职业里程碑解锁'
                              : 'Unlock via Career Ledger'}
                      </span>
                    </button>
                  </div>
                );
              },
            )}
          </div>
        )}

        {/* Tab: Permanent garage upgrades (engine / tires / cargo) */}
        {tab === 'upgrades' && (
          <div className="flex flex-col gap-2.5">
            {UPGRADE_TRACK_ORDER.map((track) => {
              const spec = UPGRADE_TRACKS[track];
              const levels = normalizeUpgradeLevels(progression.upgrades);
              const level = levels[track];
              const tier = nextUpgradeTier(track, level);
              const canAfford = tier ? progression.coins >= tier.costCoins : false;
              const buttonClass = !tier
                ? 'arcade-btn-green'
                : canAfford
                  ? 'arcade-btn-gold'
                  : 'bg-stone-700 border-2 border-[#140c04] opacity-60 cursor-not-allowed';

              return (
                <div
                  key={track}
                  className="arcade-pill-brown rounded-2xl p-3 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="arcade-stroke-sm text-white text-base leading-snug">
                        {lang === 'zh' ? spec.nameZh : spec.nameEn}
                      </div>
                      <div className="text-[11px] font-bold text-[#ffe8a3] mt-0.5">
                        {lang === 'zh' ? spec.summaryZh : spec.summaryEn}
                      </div>
                    </div>
                    <div className="shrink-0 text-[11px] font-extrabold text-[#ffee1f]">
                      {'Lv ' + level + ' / ' + MAX_UPGRADE_LEVEL}
                    </div>
                  </div>

                  <div className="flex gap-1">
                    {spec.tiers.map((step) => (
                      <div
                        key={step.level}
                        className={`${
                          step.level <= level
                            ? 'flex-1 h-1.5 rounded-full bg-[#6bf25c]'
                            : 'flex-1 h-1.5 rounded-full bg-[#2b1b08]'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="text-[11px] font-bold text-white/80">
                    {tier
                      ? lang === 'zh'
                        ? tier.nameZh + ' · ' + tier.detailZh
                        : tier.nameEn + ' · ' + tier.detailEn
                      : lang === 'zh'
                        ? '已满级，加成持续生效'
                        : 'Fully upgraded'}
                  </div>

                  <button
                    type="button"
                    disabled={!tier || !canAfford}
                    onClick={() => {
                      pokoAudio.playUiClick();
                      onPurchaseUpgrade(track);
                    }}
                    className={`${buttonClass} w-full py-2 px-3 rounded-xl cursor-pointer text-center`}
                  >
                    <span className="arcade-stroke-sm text-white text-sm">
                      {!tier
                        ? lang === 'zh'
                          ? '已满级'
                          : 'Max level'
                        : canAfford
                          ? `${t.buyFor} · ${tier.costCoins}`
                          : lang === 'zh'
                            ? '金币不足'
                            : 'Not enough coins'}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 3: Lucky Spin Wheel */}
        {tab === 'spin' && (
          <div className="flex flex-col items-center gap-3 py-1">
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
              {/* Pointer Triangle */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-[#ffe524] drop-shadow-md"
                aria-hidden="true"
              />

              {/* Rotating Wheel Disc */}
              <div
                className="w-full h-full rounded-full border-4 border-[#140c04] overflow-hidden shadow-xl transition-transform duration-800 cubic-bezier(0.16,1,0.3,1)"
                style={{
                  transform: `rotate(${wheelDeg}deg)`,
                  background:
                    'conic-gradient(#ff3b3b 0deg 60deg, #2ee54d 60deg 120deg, #ffe524 120deg 180deg, #38bdf8 180deg 240deg, #f97316 240deg 300deg, #a855f7 300deg 360deg)',
                }}
              >
                {SPIN_WHEEL_SLICES.map((slice) => {
                  const sZh = WHEEL_ZH[slice.index];
                  const label = lang === 'zh' ? sZh.label : slice.label;
                  return (
                    <div
                      key={slice.index}
                      className="absolute inset-0 flex items-start justify-center pt-3 select-none"
                      style={{
                        transform: `rotate(${slice.index * 60 + 30}deg)`,
                      }}
                    >
                      <span className="arcade-stroke-sm text-white text-[11px] sm:text-xs">
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Center Hub Nut */}
              <div
                className="absolute w-12 h-12 rounded-full bg-[#140c04] border-3 border-[#ffe524] flex items-center justify-center"
                aria-hidden="true"
              >
                <span className="arcade-stroke text-white text-xs">GO</span>
              </div>
            </div>

            {/* Spin CTA Button */}
            <button
              type="button"
              disabled={!canSpin}
              onClick={handleTriggerSpin}
              className={`${
                canSpin ? 'arcade-btn-gold' : 'bg-stone-700 opacity-60 cursor-not-allowed'
              } w-full py-3 px-5 rounded-2xl cursor-pointer text-center`}
            >
              <span className="arcade-stroke text-white text-lg">
                {spinning
                  ? lang === 'zh'
                    ? '转盘飞速转动中...'
                    : 'SPINNING...'
                  : progression.spinTokens > 0
                    ? t.freeSpin
                    : t.spinCost.replace('{cost}', String(SPIN_COST_COINS))}
              </span>
            </button>

            {lastSpinReward && !spinning && (
              <div className="arcade-pill-brown rounded-xl px-4 py-2 text-center -mt-1 animate-bounce">
                <div className="text-xs font-extrabold text-[#6bf25c]">
                  {lang === 'zh' ? '恭喜获得大奖！' : 'PRIZE UNLOCKED!'}
                </div>
                <div className="arcade-stroke-sm text-white text-sm sm:text-base">
                  {lang === 'zh'
                    ? `${WHEEL_ZH[lastSpinReward.index].label} (${WHEEL_ZH[lastSpinReward.index].detail})`
                    : `${lastSpinReward.label} (${lastSpinReward.detail})`}
                </div>
              </div>
            )}
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
            {lang === 'zh' ? '关闭车库' : 'CLOSE GARAGE'}
          </span>
        </button>
      </div>
    </div>
  );
};
