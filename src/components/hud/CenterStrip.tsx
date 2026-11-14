import React from 'react';
import type { HudState } from '../../game/types';
import type { I18nTable } from './view';

export interface CenterStripProps {
  hud: HudState;
  t: I18nTable;
  lang: 'zh' | 'en';
}

export const CenterStrip: React.FC<CenterStripProps> = (p) => {
  const { hud, t, lang } = p;
  return (
    <>
<div className="hidden md:flex flex-col items-center gap-1.5 pt-1">
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {hud.currentStreetName && (
                <div className="bg-[#165dff] border-[2.5px] border-white ring-2 ring-[#140c04] rounded-xl px-3 py-1 flex items-center gap-1.5 shadow-sm">
                  <span className="text-white text-xs font-extrabold tracking-wide leading-none">
                    <MapPinIcon className="mr-0.5" />
                    {lang === 'en' ? hud.currentStreetNameEn || hud.currentStreetName : hud.currentStreetName}
                  </span>
                </div>
              )}
              <div
                className="arcade-pill-brown rounded-full px-3 py-1 flex items-center gap-2 shadow-sm"
                title={lang === 'zh' ? '本趟外卖实时净收入与顾客评分' : 'Live Rider Net Earnings & Review Score'}
              >
                <span className="arcade-stroke-sm text-[#6bf25c] text-xs sm:text-sm leading-none tabular-nums">
                  ¥{(hud.deliveryIncomeYuan ?? 0).toFixed(1)}
                </span>
                <span className="text-[11px] font-extrabold text-[#ffee1f] leading-none">
                  ★ {(hud.customerReviewScore ?? 5.0).toFixed(1)}
                </span>
              </div>
              {hud.lastEarningEvent && (
                <div
                  key={`earn-${hud.lastEarningEvent.id}`}
                  className={`${
                    hud.lastEarningEvent.isReward
                      ? 'bg-[#16a34a] border-[#052e16]'
                      : 'bg-[#e11d48] border-[#4c0519]'
                  } border-2 rounded-full px-3 py-1 flex items-center gap-1.5 shadow-sm`}
                >
                  <span className="arcade-stroke-sm text-white text-xs leading-none tabular-nums">
                    {hud.lastEarningEvent.amountYuan >= 0 ? '+' : '-'}¥
                    {Math.abs(hud.lastEarningEvent.amountYuan).toFixed(1)}
                  </span>
                  <span className="text-[11px] font-extrabold text-white/95 leading-none">
                    {hud.lastEarningEvent.label}
                  </span>
                </div>
              )}
            </div>

            {hud.isWrongWay && (
              <div className="arcade-pill-brown border-[#1d1205] rounded-full px-4 py-1.5 flex items-center gap-2.5 whitespace-nowrap">
                <span className="arcade-stroke-sm text-[#ff4d5a] text-sm sm:text-base">
                  {t.wrongWayWarning}
                </span>
                <span className="w-16 h-3 bg-black/50 rounded-full overflow-hidden border-2 border-[#1d1205]">
                  <span
                    className="block h-full arcade-bar-gold transition-all duration-75"
                    style={{
                      width: `${Math.round(Math.min(100, hud.wrongWayProgress * 100))}%`,
                    }}
                  />
                </span>
              </div>
            )}

            {(hud.driftTier ?? 0) > 0 && (
              <div
                className={`border-2 border-[#1d1205] rounded-full px-4 py-1 flex items-center gap-2 shadow-sm ${
                  hud.driftTier === 2 ? 'bg-[#facc15]' : 'bg-[#38bdf8]'
                }`}
              >
                <span className="font-display text-xs sm:text-sm text-[#140c04] leading-none">
                  {hud.driftTier === 2 ? (
                    <>
                      <FlameIcon className="mr-0.5" />
                      {t.driftSparkT2}
                    </>
                  ) : (
                    <>
                      <BoltIcon className="mr-0.5" />
                      {t.driftSparkT1}
                    </>
                  )}
                </span>
              </div>
            )}

            {hud.bannerEvent && (
              <div
                key={hud.bannerEvent.id}
                className="arcade-boost-rim rounded-full p-1 whitespace-nowrap"
              >
                <div className="bg-[#493214] border-2 border-[#1d1205] rounded-full px-4 py-1 flex items-center gap-2">
                  <span
                    className={`arcade-stroke-sm text-sm sm:text-base ${
                      hud.bannerEvent.tone === 'emerald'
                        ? 'text-[#6bf25c]'
                        : hud.bannerEvent.tone === 'amber'
                          ? 'text-[#ffee1f]'
                          : 'text-[#ff5c6a]'
                    }`}
                  >
                    {hud.bannerEvent.label}
                  </span>
                  <span className="arcade-stroke-sm text-white text-xs sm:text-sm">
                    {hud.bannerEvent.detail}
                  </span>
                </div>
              </div>
            )}
          </div>
    </>
  );
};
import { MapPinIcon, FlameIcon, BoltIcon } from './icons';
