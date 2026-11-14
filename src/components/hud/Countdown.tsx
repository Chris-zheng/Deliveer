import React from 'react';
import type { HudState } from '../../game/types';
import type { I18nTable } from './view';

export interface CountdownProps {
  hud: HudState & { countdownStage: number };
  t: I18nTable;
  lang: 'zh' | 'en';
}

export const Countdown: React.FC<CountdownProps> = (p) => {
  const { hud, t, lang } = p;
  return (
    <>
<div
          key={`cd-${hud.countdownStage}`}
          data-testid="hud-countdown-badge"
          className={`pointer-events-none fixed inset-0 flex flex-col items-center z-30 px-4 ${
            hud.countdownStage > 0
              ? 'justify-center pb-6 md:pb-0 md:justify-start md:pt-20'
              : 'justify-start pt-14 md:pt-20'
          }`}
        >
          <div
            className={`arcade-boost-rim rounded-[2rem] p-1 md:p-1.5 shadow-xl transition-transform duration-150 ${
              hud.countdownStage === 0 ? 'scale-100 md:scale-105' : 'scale-100'
            }`}
          >
            <div
              className={`${
                hud.countdownStage === 0
                  ? 'bg-[#2ea836] px-6 py-1.5 sm:px-10 sm:py-3.5 min-w-[140px] sm:min-w-[220px]'
                  : `${
                      hud.rocketStartStatus === 'primed'
                        ? 'bg-[#f59e0b]'
                        : 'bg-[#493214]'
                    } px-7 py-2.5 sm:px-10 sm:py-3.5 min-w-[168px] sm:min-w-[220px]`
              } border-[3.5px] border-[#140c04] rounded-[1.65rem] flex flex-col items-center`}
            >
              <span className="arcade-stroke-sm text-[#ffee1f] text-[10px] sm:text-xs uppercase tracking-wider leading-none mb-1">
                {hud.countdownStage === 0
                  ? hud.rocketStartStatus === 'launched'
                    ? t.turboRocket
                    : t.shiftStarted
                  : hud.customCity
                    ? hud.customCity.districtName
                    : `${t.stage.replace('{level}', String(hud.level))} · ${hud.districtName}`}
              </span>
              <span
                className={`arcade-stroke-lg leading-none ${
                  hud.countdownStage === 0
                    ? 'text-white text-4xl sm:text-7xl'
                    : hud.countdownStage === 1
                      ? 'text-[#6bf25c] text-6xl sm:text-7xl'
                      : 'text-[#ffee1f] text-6xl sm:text-7xl'
                }`}
              >
                {hud.countdownStage === 0 ? t.go : hud.countdownStage}
              </span>
            </div>
          </div>

          {hud.countdownStage > 0 && (
            <div className="mt-2.5 arcade-pill-brown rounded-full px-4 py-1 border-2 border-[#140c04]">
              <span
                className={`arcade-stroke-sm text-xs sm:text-sm ${
                  hud.rocketStartStatus === 'primed'
                    ? 'text-[#6bf25c]'
                    : hud.rocketStartStatus === 'sputter'
                      ? 'text-[#ff6b78]'
                      : hud.countdownStage === 1
                        ? 'text-[#ffee1f]'
                        : 'text-white'
                }`}
              >
                {hud.rocketStartStatus === 'primed' ? (
                  t.rocketCharged
                ) : hud.rocketStartStatus === 'sputter' ? (
                  t.rocketTooEarly
                ) : hud.countdownStage === 1 ? (
                  <>
                    <span className="md:hidden">
                      {t.rocketPromptMobile}
                    </span>
                    <span className="hidden md:inline">
                      {t.rocketPromptDesktop}
                    </span>
                  </>
                ) : (
                  t.rocketReady
                )}
              </span>
            </div>
          )}
        </div>
    </>
  );
};
