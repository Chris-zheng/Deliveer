import React from 'react';
import type { HudState } from '../../game/types';
import type { I18nTable } from './view';
import { touchControls } from '../../game/touchControls';
import { triggerWindowKeyPulse } from './utils';
import { RedAlertBadge } from './RedAlertBadge';

export interface TopColumnsProps {
  hud: HudState;
  t: I18nTable;
  lang: 'zh' | 'en';
  starClipId: string;
  deliveryPct: number;
  isCriticalHealth: boolean;
  onPause: () => void;
  onRestart: () => void;
  onOpenQuests: () => void;
  hasClaimableQuest: boolean;
}

export const TopColumns: React.FC<TopColumnsProps> = (p) => {
  const {
    hud,
    t,
    lang,
    starClipId,
    deliveryPct,
    isCriticalHealth,
    onPause,
    onRestart,
    onOpenQuests,
    hasClaimableQuest,
  } = p;
  return (
    <>
<div className="flex flex-col items-start gap-1.5 md:gap-2.5 min-w-0">
            {/* Reference 1: 3-Pill Horizontal Resource Bar (Responsive for both 375px Mobile & 1440px Desktop!) */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 md:gap-5">
              {/* Pill 1: Tilted Golden Level Star + Golden Delivery Progress Bar */}
              <div className="flex items-center">
                <div className="relative w-10 h-10 md:w-14 md:h-14 -mr-3.5 md:-mr-5 z-10 shrink-0 flex items-center justify-center">
                  <svg
                    viewBox="0 0 56 56"
                    className="w-full h-full drop-shadow-sm overflow-visible"
                    aria-hidden="true"
                  >
                    <defs>
                      <clipPath id={starClipId}>
                        <path d="M26.0 7.85 Q28.0 4.8 30.0 7.85 L35.01 15.48 Q36.35 17.51 38.70 18.15 L47.50 20.56 Q51.02 21.52 48.74 24.37 L43.03 31.49 Q41.51 33.39 41.62 35.82 L42.05 44.93 Q42.22 48.58 38.81 47.29 L30.28 44.06 Q28.0 43.2 25.72 44.06 L17.19 47.29 Q13.78 48.58 13.95 44.93 L14.38 35.82 Q14.49 33.39 12.97 31.49 L7.26 24.37 Q4.98 21.52 8.50 20.56 L17.30 18.15 Q19.65 17.51 20.99 15.48 Z" />
                      </clipPath>
                    </defs>
                    <g transform="rotate(-6 28 29)">
                      <g clipPath={`url(#${starClipId})`}>
                        <rect x="0" y="0" width="56" height="56" fill="#ffe629" />
                        <path
                          d="M56 17 L56 56 L0 56 L12 33 L28.5 29.5 Z"
                          fill="#f59e0b"
                        />
                        <ellipse
                          cx="25"
                          cy="16"
                          rx="4.4"
                          ry="6.5"
                          transform="rotate(-16 25 16)"
                          fill="#fffad6"
                          opacity="0.92"
                        />
                      </g>
                      <path
                        d="M26.0 7.85 Q28.0 4.8 30.0 7.85 L35.01 15.48 Q36.35 17.51 38.70 18.15 L47.50 20.56 Q51.02 21.52 48.74 24.37 L43.03 31.49 Q41.51 33.39 41.62 35.82 L42.05 44.93 Q42.22 48.58 38.81 47.29 L30.28 44.06 Q28.0 43.2 25.72 44.06 L17.19 47.29 Q13.78 48.58 13.95 44.93 L14.38 35.82 Q14.49 33.39 12.97 31.49 L7.26 24.37 Q4.98 21.52 8.50 20.56 L17.30 18.15 Q19.65 17.51 20.99 15.48 Z"
                        fill="none"
                        stroke="#140c04"
                        strokeWidth="3.8"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    </g>
                  </svg>
                  <span
                    className="absolute inset-0 flex items-center justify-center pt-1 md:pt-1.5 arcade-stroke text-white text-sm md:text-2xl leading-none"
                    aria-label={`Stage ${hud.level}`}
                  >
                    {hud.level}
                  </span>
                </div>

                <div
                  className="arcade-pill-brown rounded-full h-8 md:h-10 w-[78px] sm:w-28 md:w-40 relative overflow-hidden flex items-center justify-end pr-2 md:pr-3.5 pl-4 md:pl-6"
                  aria-label={`Deliveries ${hud.deliveredCount} of ${hud.totalStops}`}
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 arcade-bar-gold transition-all duration-200 ${
                      deliveryPct < 100 ? 'border-r-[2.5px] border-[#140c04]' : ''
                    }`}
                    style={{ width: `${Math.max(26, deliveryPct)}%` }}
                  />
                  <span className="relative z-10 arcade-stroke-sm text-white text-xs sm:text-sm md:text-lg leading-none">
                    {hud.deliveredCount}/{hud.totalStops}
                  </span>
                </div>
              </div>

              {/* Pill 2: Gold Coin Score Counter */}
              <div className="flex items-center">
                <svg
                  viewBox="0 0 48 48"
                  className="w-8 h-8 md:w-13 md:h-13 -mr-3.5 md:-mr-5 z-10 shrink-0 drop-shadow-sm"
                  aria-hidden="true"
                >
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    fill="#ffe524"
                    stroke="#140c04"
                    strokeWidth="3.6"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="14"
                    fill="#df8f0d"
                    stroke="#b86b00"
                    strokeWidth="2"
                  />
                  <path
                    d="M24 13v22M28.5 18.2c0-2-2-3.2-4.5-3.2s-4.5 1.2-4.5 3.1c0 4.3 9 2.6 9 7.4 0 2.1-2 3.5-4.5 3.5s-4.5-1.3-4.5-3.4"
                    stroke="#ffe629"
                    strokeWidth="3.4"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>

                <div
                  className="arcade-pill-brown rounded-full h-8 md:h-10 min-w-[64px] sm:min-w-[96px] md:min-w-[148px] pl-4 md:pl-6 pr-2.5 md:pr-4 flex items-center justify-center gap-1"
                  aria-label={`Coins ${hud.coins}, Score ${hud.score}`}
                >
                  <span className="arcade-stroke text-white text-sm sm:text-lg md:text-2xl leading-none">
                    {hud.coins.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Pill 3: Faceted Red Ruby Hull Counter + Golden Square Pause Cap (Visible on BOTH Mobile & Desktop!) */}
              <div className="flex items-center">
                <svg
                  viewBox="0 0 48 48"
                  className="w-8 h-8 md:w-13 md:h-13 -mr-3 md:-mr-4 z-10 shrink-0 drop-shadow-sm"
                  aria-hidden="true"
                >
                  <polygon
                    points="14,8 34,8 44,20 24,43 4,20"
                    fill="#ff2430"
                    stroke="#140c04"
                    strokeWidth="3.6"
                    strokeLinejoin="round"
                  />
                  <polygon points="14,8 24,8 17,20 4,20" fill="#ff99a3" />
                  <polygon points="34,8 44,20 31,20 24,8" fill="#d90429" />
                  <polygon points="4,20 17,20 24,43" fill="#e0112b" />
                  <polygon points="31,20 44,20 24,43" fill="#ad031b" />
                  <polygon points="17,20 31,20 24,43" fill="#ff3b47" />
                  <line
                    x1="4"
                    y1="20"
                    x2="44"
                    y2="20"
                    stroke="#140c04"
                    strokeWidth="2"
                    strokeOpacity="0.45"
                  />
                </svg>

                <div
                  className="arcade-pill-brown rounded-l-full rounded-r-xl h-8 md:h-10 min-w-[54px] md:min-w-[110px] pl-3.5 md:pl-5 pr-2.5 md:pr-4 flex items-center justify-center gap-1"
                  aria-label={`Van integrity ${hud.health} of ${hud.maxHealth}${
                    hud.hasBumperShield ? ', bumper shield active' : ''
                  }`}
                >
                  <span
                    className={`arcade-stroke text-sm sm:text-lg md:text-2xl leading-none ${
                      isCriticalHealth ? 'text-[#ffe524]' : 'text-white'
                    }`}
                  >
                    {hud.health}/{hud.maxHealth}
                  </span>
                  {hud.hasBumperShield && (
                    <span
                      className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 rounded-full bg-[#38bdf8] border-2 border-[#140c04] shrink-0"
                      title="Bumper Shield Active"
                    />
                  )}
                </div>

                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Pause game [P]"
                  title="Pause [P]"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onPause();
                  }}
                  className="pointer-events-auto arcade-cap-gold -ml-1.5 md:-ml-2 z-10 w-9 h-9 md:w-11 md:h-11 rounded-xl flex items-center justify-center cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 md:w-5 md:h-5" fill="none">
                    <rect
                      x="5.5"
                      y="4.5"
                      width="5"
                      height="15"
                      rx="1.5"
                      fill="#ffffff"
                      stroke="#140c04"
                      strokeWidth="2.4"
                    />
                    <rect
                      x="13.5"
                      y="4.5"
                      width="5"
                      height="15"
                      rx="1.5"
                      fill="#ffffff"
                      stroke="#140c04"
                      strokeWidth="2.4"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Reference 4: Left-Edge Semicircular Docked Action Buttons (Compact on Mobile, Full Size on Desktop) */}
            <div className="pointer-events-auto -ml-2.5 sm:-ml-4 flex flex-col items-start gap-1.5 md:gap-2.5 mt-0.5 md:mt-1.5">
              {/* Button 1: TURBO Wheel (with Red "!" Badge when Boost Ready) */}
              <button
                type="button"
                tabIndex={-1}
                aria-label="Trigger turbo boost wheel [Shift]"
                title="Turbo Boost [Shift]"
                onClick={(e) => {
                  e.currentTarget.blur();
                  touchControls.boostPulse = true;
                  triggerWindowKeyPulse('ShiftLeft');
                }}
                className="hidden md:flex arcade-dock-tab rounded-r-[34px] pl-3 pr-4 pt-2 pb-1.5 flex-col items-center justify-center min-w-[86px] relative cursor-pointer"
              >
                {hud.boostReady && <RedAlertBadge />}
                <svg
                  viewBox="0 0 56 56"
                  className="w-12 h-12 sm:w-13 sm:h-13 drop-shadow-sm"
                  aria-hidden="true"
                >
                  <circle
                    cx="28"
                    cy="29"
                    r="22"
                    fill="#173763"
                    stroke="#140c04"
                    strokeWidth="3.5"
                  />
                  <path d="M28 29L28 10A19 19 0 0144.5 19.5Z" fill="#ff3b3b" />
                  <path d="M28 29L44.5 19.5A19 19 0 0144.5 38.5Z" fill="#2ee54d" />
                  <path d="M28 29L44.5 38.5A19 19 0 0128 48Z" fill="#ffe524" />
                  <path d="M28 29L28 48A19 19 0 0111.5 38.5Z" fill="#ff3b3b" />
                  <path d="M28 29L11.5 38.5A19 19 0 0111.5 19.5Z" fill="#ffe524" />
                  <path d="M28 29L11.5 19.5A19 19 0 0128 10Z" fill="#2ee54d" />
                  <circle
                    cx="28"
                    cy="29"
                    r="19"
                    fill="none"
                    stroke="#140c04"
                    strokeWidth="2.4"
                  />
                  <polygon
                    points="18,7 38,7 28,27"
                    fill="#ffe524"
                    stroke="#140c04"
                    strokeWidth="3"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="28"
                    cy="29"
                    r="6"
                    fill="#ffe524"
                    stroke="#140c04"
                    strokeWidth="2.8"
                  />
                  <circle cx="28" cy="29" r="2.6" fill="#ff2430" />
                </svg>
                <span className="-mt-1.5 arcade-stroke-sm text-white text-[11px] sm:text-sm md:text-base uppercase leading-none whitespace-nowrap">
                  {hud.isBoosting ? (lang === 'zh' ? '加速中' : 'ACTIVE') : (lang === 'zh' ? '涡轮' : 'TURBO')}
                </span>
              </button>

              {/* Button 2: Golden Stopwatch RETRY */}
              <button
                type="button"
                tabIndex={-1}
                aria-label={t.restart}
                title={t.restart}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onRestart();
                }}
                className="arcade-dock-tab rounded-r-[26px] md:rounded-r-[34px] pl-2.5 md:pl-3 pr-3 md:pr-4 pt-1.5 md:pt-2 pb-1 md:pb-1.5 flex flex-col items-center justify-center min-w-[76px] md:min-w-[86px] relative cursor-pointer"
              >
                <svg
                  viewBox="0 0 56 56"
                  className="w-9 h-9 md:w-13 md:h-13 drop-shadow-sm"
                  aria-hidden="true"
                >
                  <polygon
                    points="31,5 43,10 39,16 28,11"
                    fill="#ffe524"
                    stroke="#140c04"
                    strokeWidth="3"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="27"
                    cy="31"
                    r="20"
                    fill="#ffbf14"
                    stroke="#140c04"
                    strokeWidth="3.5"
                  />
                  <path
                    d="M13 21A17 17 0 0138 16"
                    stroke="#fff394"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <circle
                    cx="27"
                    cy="31"
                    r="13.5"
                    fill="#ffffff"
                    stroke="#140c04"
                    strokeWidth="2.4"
                  />
                  <path
                    d="M25.5 21.5l1.5 9.5"
                    stroke="#140c04"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                  <circle cx="27" cy="31" r="2.6" fill="#140c04" />
                  <circle cx="18" cy="27" r="1.5" fill="#475569" />
                  <circle cx="36" cy="27" r="1.5" fill="#475569" />
                  <circle cx="21" cy="38" r="1.5" fill="#475569" />
                  <circle cx="33" cy="38" r="1.5" fill="#475569" />
                </svg>
                <span className="-mt-1 md:-mt-1.5 arcade-stroke-sm text-white text-[10px] sm:text-[11px] md:text-base uppercase leading-none whitespace-nowrap">
                  {t.retry}
                </span>
              </button>

              {/* Button 3: Wooden Clipboard with Red Checkmark QUESTS (Reference 4!) */}
              <button
                type="button"
                tabIndex={-1}
                aria-label="Open shift quests and rules [J]"
                title="Shift Quests & Handbook [J]"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onOpenQuests();
                }}
                className="arcade-dock-tab rounded-r-[26px] md:rounded-r-[34px] pl-2.5 md:pl-3 pr-3 md:pr-4 pt-1.5 md:pt-2 pb-1 md:pb-1.5 flex flex-col items-center justify-center min-w-[76px] md:min-w-[124px] relative cursor-pointer"
              >
                {(hasClaimableQuest || hud.ticketsCount > 0) && <RedAlertBadge />}
                <svg
                  viewBox="0 0 56 56"
                  className="w-9 h-9 md:w-13 md:h-13 drop-shadow-sm"
                  aria-hidden="true"
                >
                  <g transform="rotate(-9 28 28)">
                    <rect
                      x="11"
                      y="10"
                      width="32"
                      height="38"
                      rx="5"
                      fill="#a4662c"
                      stroke="#140c04"
                      strokeWidth="3.4"
                    />
                    <rect
                      x="21"
                      y="6"
                      width="12"
                      height="7"
                      rx="3"
                      fill="#b87a3d"
                      stroke="#140c04"
                      strokeWidth="2.8"
                    />
                    <rect
                      x="15.5"
                      y="15"
                      width="23"
                      height="28"
                      rx="2"
                      fill="#ffffff"
                      stroke="#140c04"
                      strokeWidth="2.2"
                    />
                    <path
                      d="M19.5 22h15M19.5 29h15M19.5 36h11"
                      stroke="#94a3b8"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                    />
                  </g>
                  <path
                    d="M14 28l9 9 22-20"
                    stroke="#140c04"
                    strokeWidth="8.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <path
                    d="M14 28l9 9 22-20"
                    stroke="#ff1f2d"
                    strokeWidth="4.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
                <span className="-mt-1 md:-mt-1.5 arcade-stroke-sm text-white text-[10px] sm:text-[11px] md:text-base uppercase leading-none whitespace-nowrap">
                  {t.quests}
                </span>
              </button>
            </div>
          </div>
    </>
  );
};
