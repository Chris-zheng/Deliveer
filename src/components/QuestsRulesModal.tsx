/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { pokoAudio } from '../game/audio';
import { SupportedLanguage } from '../game/i18n';
import { PlayerProgression, QuestKind } from '../game/types';

interface QuestsRulesModalProps {
  open: boolean;
  progression: PlayerProgression;
  lang?: SupportedLanguage;
  onClaimQuest: (questId: string) => void;
  onClose: () => void;
}

const QUEST_ZH: Record<QuestKind, string> = {
  bullseye_drops: '正中靶心：命中 3 次金色中心收件圈',
  express_tosses: '极速飞掷：行进中完成 4 次疾速投递',
  pitstops_used: '进站补给：光顾 2 次咖啡站或修车店',
  near_misses: '超车闪避：与道路社会车辆擦身而过 3 次',
  clean_deliveries: '模范特工：0 违章无罚单派送 5 件包裹',
};

export const QuestsRulesModal: React.FC<QuestsRulesModalProps> = ({
  open,
  progression,
  lang = 'zh',
  onClaimQuest,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quests-modal-heading"
    >
      <div className="pointer-events-auto arcade-panel rounded-3xl p-4 sm:p-6 w-full max-w-[520px] my-auto flex flex-col gap-3.5">
        {/* Header */}
        <div className="arcade-pill-brown rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-extrabold text-[#ffee1f] tracking-wide">
              {lang === 'zh' ? '每日派送赏金 · 特工考核' : 'Clipboard Bounties & Handbook'}
            </div>
            <h2
              id="quests-modal-heading"
              className="arcade-stroke text-white text-2xl sm:text-3xl leading-tight"
            >
              {lang === 'zh' ? '每日排班任务' : 'SHIFT QUESTS'}
            </h2>
          </div>

          <div className="bg-[#2b1b08] border-2 border-[#140c04] rounded-full px-3 py-1 flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-3.5 rounded-full bg-[#ffe524] border border-[#140c04]" />
            <span className="arcade-stroke-sm text-[#ffe524] text-base leading-none">
              {progression.coins.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 3 Rotating Shift Quests */}
        <div className="flex flex-col gap-2">
          {progression.quests.map((q) => {
            const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
            const readyToClaim = q.progress >= q.target && !q.claimed;
            const title = lang === 'zh' ? (QUEST_ZH[q.kind] || q.title) : q.title;

            return (
              <div
                key={q.id}
                className="arcade-pill-brown rounded-2xl p-3 flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="arcade-stroke-sm text-white text-sm sm:text-base truncate">
                    {title}
                  </div>
                  <div className="mt-1.5 h-4 bg-[#2b1b08] border-2 border-[#140c04] rounded-full overflow-hidden relative">
                    <div
                      className="h-full arcade-bar-gold transition-all duration-200"
                      style={{ width: `${pct}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-white drop-shadow">
                      {q.progress}/{q.target}
                    </span>
                  </div>
                </div>

                {readyToClaim ? (
                  <button
                    type="button"
                    onClick={() => {
                      pokoAudio.playSpinReward();
                      onClaimQuest(q.id);
                    }}
                    className="arcade-btn-green py-2 px-3.5 rounded-xl cursor-pointer shrink-0"
                  >
                    <span className="arcade-stroke-sm text-white text-xs sm:text-sm">
                      {lang === 'zh' ? `领取 +${q.rewardCoins}` : `CLAIM +${q.rewardCoins}`}
                    </span>
                  </button>
                ) : (
                  <div className="bg-[#2b1b08] border-2 border-[#140c04] rounded-xl px-3 py-1.5 shrink-0 text-center">
                    <span className="arcade-stroke-sm text-[#ffe524] text-xs sm:text-sm">
                      +{q.rewardCoins}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Compact Field Handbook */}
        <div className="bg-[#fffdf5] border-[2.5px] border-[#1d1205] rounded-2xl p-3 text-xs font-semibold text-slate-800 flex flex-col gap-1.5">
          <div>
            <strong className="font-display text-[#2b1b08]">
              {lang === 'zh' ? '驾驶与喇叭 [Q]：' : 'Driving & Horn [Q]: '}
            </strong>
            {lang === 'zh'
              ? '保持在右侧车道行驶，遵守红绿灯（或拾取绿波光球全线绿灯），按 [Q] 喇叭安抚急躁电动车！'
              : 'Keep in the Right Lane, obey signals (or grab Green-Wave Orbs), and honk [Q] to calm scooters!'}
          </div>
          <div>
            <strong className="font-display text-[#784812]">
              {lang === 'zh' ? '包裹与靶心投掷：' : 'Parcels & Bullseyes: '}
            </strong>
            {lang === 'zh'
              ? '正中金色中心圈获 +2x 连击奖励！保温热食要快送，大件沉重木箱需减速停车，修车厂可恢复耐久并加装护盾！'
              : 'Drop on the inner Gold Bullseye for +2x Combo! Deliver Hot Thermal bags fast, brake for Large Crates, and hit Wrench Garages for Hull + Shield!'}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            pokoAudio.playUiClick();
            onClose();
          }}
          className="arcade-btn-gold w-full py-3 px-5 rounded-2xl cursor-pointer"
        >
          <span className="arcade-stroke text-white text-lg sm:text-xl">
            {lang === 'zh' ? '返回派送岗位' : 'RESUME SHIFT'}
          </span>
        </button>
      </div>
    </div>
  );
};
