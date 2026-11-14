import React from 'react';
import type { HudState } from '../../game/types';
import type { I18nTable } from './view';
import { touchControls } from '../../game/touchControls';
import { formatClock, triggerWindowKeyPulse } from './utils';

export interface TopRightProps {
  hud: HudState;
  t: I18nTable;
  lang: 'zh' | 'en';
  boostPct: number;
  streakMultiplier: number;
  isLowTime: boolean;
}

export const TopRight: React.FC<TopRightProps> = (p) => {
  const { hud, t, lang, boostPct, streakMultiplier, isLowTime } = p;
  return (
    <>
<div className="flex flex-col items-end md:items-center shrink-0">
            <button
              type="button"
              tabIndex={-1}
              aria-label="Activate turbo boost [Shift]"
              title="Turbo Boost [Shift]"
              onClick={(e) => {
                e.currentTarget.blur();
                touchControls.boostPulse = true;
                triggerWindowKeyPulse('ShiftLeft');
              }}
              className="hidden md:block pointer-events-auto arcade-boost-rim rounded-full p-1 cursor-pointer"
            >
              <div
                className="bg-[#493214] border-[2.5px] border-[#1d1205] rounded-full px-5 py-1 relative overflow-hidden flex items-center gap-2"
                role="progressbar"
                aria-label="Turbo boost charge"
                aria-valuenow={boostPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                {!hud.boostReady && !hud.isBoosting && (
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-amber-400/25 transition-all duration-100"
                    style={{ width: `${boostPct}%` }}
                  />
                )}
                <span className="relative z-10 arcade-stroke-sm text-white text-xl leading-none">
                  x{streakMultiplier}
                </span>
                <span
                  className={`relative z-10 arcade-stroke text-2xl leading-none ${
                    hud.isFever
                      ? 'text-[#ff70a6]'
                      : hud.isBoosting
                        ? 'text-[#6bf25c]'
                        : hud.boostReady
                          ? 'text-[#ffee1f]'
                          : 'text-amber-200/80'
                  }`}
                >
                  {hud.isFever ? 'FEVER!' : 'BOOST'}
                </span>
              </div>
            </button>

            {/* Reference 2: Outlined White Clock Icon + MM:SS Timer */}
            <div className="flex items-center gap-1 md:gap-1.5 md:mt-1.5">
              <svg
                viewBox="0 0 28 28"
                className="w-5 h-5 md:w-7 md:h-7 shrink-0 drop-shadow-sm"
                aria-hidden="true"
              >
                <circle
                  cx="14"
                  cy="14"
                  r="11"
                  fill="#ffffff"
                  stroke="#1d1205"
                  strokeWidth="3.2"
                />
                <path
                  d="M14 8v6.2l4 3"
                  stroke="#1d1205"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
              <span
                className={`arcade-stroke text-base sm:text-xl md:text-2xl leading-none ${
                  isLowTime ? 'text-[#ff5964]' : 'text-white'
                }`}
                aria-label={`${hud.timeRemainingSec} seconds left`}
              >
                {formatClock(hud.timeRemainingSec)}
              </span>
            </div>

            <div className="mt-0.5 md:mt-1 arcade-pill-brown rounded-full px-2.5 md:px-3 py-0.5 flex items-center gap-1.5 md:gap-2">
              <span className="arcade-stroke-sm text-[#ffee1f] text-[10px] md:text-xs leading-none">
                {hud.score.toLocaleString()} PTS
              </span>
              {hud.greenWaveTimer > 0 && (
                <span className="arcade-stroke-sm text-[#6bf25c] text-[10px] md:text-xs leading-none">
                  · WAVE
                </span>
              )}
              {hud.ticketsCount > 0 && (
                <span className="arcade-stroke-sm text-[#ff6b78] text-[10px] md:text-xs leading-none">
                  · {hud.ticketsCount} TKT
                </span>
              )}
            </div>
          </div>
    </>
  );
};
