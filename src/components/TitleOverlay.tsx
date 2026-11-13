/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { pokoAudio } from '../game/audio';
import { I18N, SupportedLanguage } from '../game/i18n';
import { LevelConfig } from '../game/types';
import {
  HANDLING_LABELS,
  HANDLING_PRESETS,
  VIEW_MODE_LABELS,
  VIEW_MODES,
  getHandlingPreset,
  getViewMode,
  setHandlingPreset,
  setViewMode,
  type HandlingPreset,
  type ViewMode,
} from '../game/controls';

interface TitleOverlayProps {
  selectedLevel?: number;
  highestUnlockedLevel?: number;
  muted: boolean;
  lang: SupportedLanguage;
  customCityConfig?: LevelConfig | null;
  onSelectLevel?: (lvl: number) => void;
  onStart: () => void;
  daily?: {
    dateKey: string;
    targetScore: number;
    rewardCoins: number;
    bestScore: number;
    cleared: boolean;
  } | null;
  onStartDaily?: () => void;
  onToggleMute: () => void;
  onToggleLang: () => void;
  onOpenCustomCity: () => void;
  onClearCustomCity?: () => void;
}

const WELCOME_COURIER_LETTERS: Array<{
  ch: string;
  x: number;
  y: number;
  rot: number;
}> = [
  { ch: 'C', x: 102, y: 78, rot: -6 },
  { ch: 'O', x: 158, y: 72, rot: 3 },
  { ch: 'U', x: 216, y: 70, rot: -3 },
  { ch: 'R', x: 274, y: 71, rot: 3 },
  { ch: 'I', x: 319, y: 72, rot: -2 },
  { ch: 'E', x: 361, y: 74, rot: 4 },
  { ch: 'R', x: 416, y: 78, rot: -4 },
];

const WELCOME_FIELD_LETTERS: Array<{
  ch: string;
  x: number;
  y: number;
  rot: number;
}> = [
  { ch: 'F', x: 164, y: 140, rot: -5 },
  { ch: 'I', x: 207, y: 137, rot: 2 },
  { ch: 'E', x: 251, y: 136, rot: -3 },
  { ch: 'L', x: 301, y: 137, rot: 3 },
  { ch: 'D', x: 356, y: 140, rot: -3 },
];

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  selectedLevel = 1,
  highestUnlockedLevel = 1,
  muted,
  lang,
  customCityConfig,
  onSelectLevel,
  onStart,
  daily,
  onStartDaily,
  onToggleMute,
  onToggleLang,
  onOpenCustomCity,
  onClearCustomCity,
}) => {
  const t = I18N[lang];
  // Comfort settings are persisted in game/controls and pushed straight into the sim.
  const [viewMode, setViewModeState] = React.useState<ViewMode>(() => getViewMode());
  const [handling, setHandlingState] = React.useState<HandlingPreset>(() => getHandlingPreset());
  const pickView = (next: ViewMode) => {
    setViewMode(next);
    setViewModeState(next);
    pokoAudio.playUiClick();
  };
  const pickHandling = (next: HandlingPreset) => {
    setHandlingPreset(next);
    setHandlingState(next);
    pokoAudio.playUiClick();
  };

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center p-3 sm:p-4 bg-[#241309]/55 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-heading"
    >
      {/* Top-Right Control Bar: Language Switcher + Audio Toggle */}
      <div className="fixed top-3 right-3 sm:top-5 sm:right-5 z-30 flex items-center gap-2">
        {/* Language Switcher Pill */}
        <button
          type="button"
          onClick={() => {
            pokoAudio.playUiClick();
            onToggleLang();
          }}
          className="group pointer-events-auto relative px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl bg-gradient-to-b from-[#ffdf24] to-[#f59b14] border-[3px] border-[#5a270f] shadow-[inset_0_2px_0_rgba(255,255,255,0.6),0_3px_0_rgba(50,20,5,0.4)] flex items-center justify-center gap-1.5 cursor-pointer transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
          aria-label={lang === 'zh' ? 'Switch to English' : '切换为简体中文'}
        >
          <span className="text-sm">🌐</span>
          <span className="arcade-stroke-sm text-white text-xs sm:text-sm font-bold tracking-wide">
            {lang === 'zh' ? '中 / EN' : 'EN / 中文'}
          </span>
        </button>

        {/* Top-Right Top-Tufted Terracotta Squircle Audio Button */}
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMute();
          }}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          className="group pointer-events-auto relative w-12 h-13 sm:w-14 sm:h-15 flex items-center justify-center cursor-pointer transition-transform duration-150 ease-out hover:-translate-y-0.5 active:translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFF3B0]"
        >
          <svg
            viewBox="0 0 64 68"
            className="absolute inset-0 w-full h-full drop-shadow-[0_4px_0_rgba(62,21,6,0.45)]"
            fill="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id="muteTerracottaGrad"
                x1="32"
                y1="4"
                x2="32"
                y2="63"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#F5803D" />
                <stop offset="52%" stopColor="#E45A25" />
                <stop offset="100%" stopColor="#CA4216" />
              </linearGradient>
            </defs>
            <path
              d="M23 13 C26 11, 29 6, 32 3 C35 6, 38 11, 41 13 L44 13 C53 13, 58 18, 58 28 L58 47 C58 57, 52 63, 42 63 L22 63 C12 63, 6 57, 6 47 L6 28 C6 18, 11 13, 20 13 Z"
              fill="url(#muteTerracottaGrad)"
              stroke="#8B2A0E"
              strokeWidth="3.4"
              strokeLinejoin="round"
            />
            <path
              d="M14 20 C18 17, 25 16, 32 10 C39 16, 46 17, 50 20"
              stroke="#FFB27E"
              strokeWidth="2.4"
              strokeLinecap="round"
              opacity="0.65"
            />
            <circle cx="15" cy="52" r="3" fill="#B53711" opacity="0.55" />
            <circle cx="50" cy="49" r="2.5" fill="#B53711" opacity="0.5" />
          </svg>

          {muted ? (
            <svg
              viewBox="0 0 28 28"
              className="relative z-10 w-6 h-6 sm:w-7 sm:h-7 mt-1 drop-shadow-[0_2px_0_#8B2A0E]"
              fill="none"
            >
              <path
                d="M13 6.5L7.5 11H4v6h3.5L13 21.5V6.5z"
                fill="#FFF8E3"
                stroke="#7A240B"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M23.5 10.5l-5.5 7M18 10.5l5.5 7"
                stroke="#FFE066"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg
              viewBox="0 0 28 28"
              className="relative z-10 w-6 h-6 sm:w-7 sm:h-7 mt-1 drop-shadow-[0_2px_0_#8B2A0E]"
              fill="none"
            >
              <path
                d="M13 6.5L7.5 11H4v6h3.5L13 21.5V6.5z"
                fill="#FFF8E3"
                stroke="#7A240B"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M17.5 10.5a5 5 0 010 7M21 7.5a9 9 0 010 13"
                stroke="#FFF8E3"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Single Centered Illustrated Storybook Welcome Dialogue */}
      <div className="pointer-events-auto relative overflow-hidden rounded-[34px] border-[4px] border-[#61270E] shadow-[0_14px_34px_rgba(28,11,3,0.52),inset_0_-7px_0_#C88242] p-4 sm:px-7 sm:py-5 w-full max-w-[680px] my-auto flex flex-col gap-3.5 bg-[#F5C882]">
        {/* Illustrated Dusk-to-Sunlit-Avenue Backdrop SVG */}
        <svg
          viewBox="0 0 630 480"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 w-full h-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="welcomeSkyAvenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9A84BC" />
              <stop offset="25%" stopColor="#DF9787" />
              <stop offset="54%" stopColor="#F8CF88" />
              <stop offset="100%" stopColor="#E6AD66" />
            </linearGradient>
            <radialGradient id="welcomeSunGlow" cx="50%" cy="36%" r="46%">
              <stop offset="0%" stopColor="#FFF5C8" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#F8CF88" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="630" height="480" fill="url(#welcomeSkyAvenue)" />
          <rect width="630" height="480" fill="url(#welcomeSunGlow)" />

          {/* Soft twilight stars */}
          <circle cx="132" cy="24" r="2" fill="#FFF7DE" opacity="0.7" />
          <circle cx="228" cy="16" r="1.5" fill="#FFF7DE" opacity="0.55" />
          <circle cx="412" cy="19" r="2" fill="#FFF7DE" opacity="0.65" />
          <circle cx="496" cy="28" r="1.6" fill="#FFF7DE" opacity="0.55" />

          {/* Hand-illustrated coral-blossom tree canopies & branches in upper corners */}
          <g>
            <path
              d="M32 132 Q42 96 58 70"
              stroke="#7A4422"
              strokeWidth="9"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M-8 62 C-4 34, 24 22, 48 30 C64 18, 94 24, 102 46 C116 54, 114 78, 94 86 C76 96, 44 96, 26 90 C6 94, -12 80, -8 62 Z"
              fill="#EA6256"
              opacity="0.9"
            />
            <path
              d="M6 50 C14 34, 38 28, 56 36 C70 28, 90 34, 94 50 C78 58, 42 60, 6 50 Z"
              fill="#F78572"
              opacity="0.75"
            />

            <path
              d="M598 132 Q586 96 570 70"
              stroke="#7A4422"
              strokeWidth="9"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M528 48 C536 24, 566 18, 584 30 C606 22, 634 34, 638 62 C642 80, 624 94, 604 90 C586 96, 554 96, 536 86 C516 78, 514 56, 528 48 Z"
              fill="#EA6256"
              opacity="0.9"
            />
            <path
              d="M536 50 C542 34, 562 28, 578 36 C596 28, 616 34, 624 50 C588 60, 552 58, 536 50 Z"
              fill="#F78572"
              opacity="0.75"
            />
          </g>

          {/* Perspective street lines */}
          <polygon
            points="245,215 180,215 0,400 0,480 86,480"
            fill="#D39252"
            opacity="0.34"
          />
          <polygon
            points="385,215 450,215 630,400 630,480 544,480"
            fill="#D39252"
            opacity="0.34"
          />
        </svg>

        {/* Subtle inner cream highlight border */}
        <div
          className="pointer-events-none absolute inset-[3px] rounded-[29px] border-2 border-[#FFF6DC]/45"
          aria-hidden="true"
        />

        {/* Row 1: Logo Lockup */}
        <div className="relative z-10 flex flex-col items-center text-center pt-0.5">
          <div
            style={{ fontFamily: "'Skranji', 'Lilita One', cursive" }}
            className="text-xs sm:text-sm font-bold tracking-wider text-[#FFF9E6] drop-shadow-[0_2px_0_#6B2D12]"
          >
            {t.gameSubtitle}
          </div>

          <h1 id="welcome-heading" className="sr-only">
            {t.gameTitle}
          </h1>

          {/* Bilingual Logo SVG Lockup */}
          {lang === 'zh' ? (
            <div className="my-1 flex flex-col items-center">
              <div className="arcade-stroke-lg text-4xl sm:text-6xl text-[#ffdf24] tracking-wider drop-shadow-md">
                极速派送
              </div>
              <div className="arcade-stroke text-2xl sm:text-4xl text-[#9ef01a] -mt-1 sm:-mt-2 tracking-widest">
                快递乐园
              </div>
            </div>
          ) : (
            <svg
              viewBox="0 0 520 158"
              className="w-full max-w-[445px] h-auto -mt-1.5 select-none drop-shadow-[0_5px_0_rgba(58,26,10,0.34)]"
              aria-hidden="true"
            >
              <defs>
                <linearGradient
                  id="courierGoldFill"
                  x1="0"
                  y1="14"
                  x2="0"
                  y2="86"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#FFF570" />
                  <stop offset="50%" stopColor="#FFB52B" />
                  <stop offset="100%" stopColor="#E67116" />
                </linearGradient>

                <linearGradient
                  id="fieldLimeFill"
                  x1="0"
                  y1="84"
                  x2="0"
                  y2="150"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#DCF866" />
                  <stop offset="55%" stopColor="#93D535" />
                  <stop offset="100%" stopColor="#61A61D" />
                </linearGradient>

                <linearGradient id="cubeLimeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#CEF459" />
                  <stop offset="100%" stopColor="#77BC22" />
                </linearGradient>
              </defs>

              {/* Floating playful lime cubes */}
              <g transform="translate(458, 22) rotate(12)">
                <rect
                  x="0"
                  y="0"
                  width="24"
                  height="24"
                  rx="6"
                  fill="url(#cubeLimeGrad)"
                  stroke="#3D2212"
                  strokeWidth="5.5"
                />
              </g>

              {/* Top Word: COURIER */}
              <g
                style={{
                  fontFamily: "'Skranji', 'Lilita One', sans-serif",
                  fontWeight: 700,
                  fontSize: '74px',
                }}
                textAnchor="middle"
              >
                {WELCOME_COURIER_LETTERS.map((item, idx) => (
                  <g
                    key={`c-shadow-${idx}`}
                    transform={`translate(${item.x}, ${item.y + 7}) rotate(${item.rot})`}
                  >
                    <text
                      fill="#3D2212"
                      stroke="#3D2212"
                      strokeWidth="15"
                      strokeLinejoin="round"
                    >
                      {item.ch}
                    </text>
                  </g>
                ))}
                {WELCOME_COURIER_LETTERS.map((item, idx) => (
                  <g
                    key={`c-main-${idx}`}
                    transform={`translate(${item.x}, ${item.y}) rotate(${item.rot})`}
                  >
                    <text
                      fill="url(#courierGoldFill)"
                      stroke="#3D2212"
                      strokeWidth="13"
                      strokeLinejoin="round"
                      style={{ paintOrder: 'stroke fill' }}
                    >
                      {item.ch}
                    </text>
                  </g>
                ))}
              </g>

              {/* Bottom Word: FIELD */}
              <g
                style={{
                  fontFamily: "'Skranji', 'Lilita One', sans-serif",
                  fontWeight: 700,
                  fontSize: '72px',
                }}
                textAnchor="middle"
              >
                {WELCOME_FIELD_LETTERS.map((item, idx) => (
                  <g
                    key={`f-shadow-${idx}`}
                    transform={`translate(${item.x}, ${item.y + 7}) rotate(${item.rot})`}
                  >
                    <text
                      fill="#382110"
                      stroke="#382110"
                      strokeWidth="15"
                      strokeLinejoin="round"
                    >
                      {item.ch}
                    </text>
                  </g>
                ))}
                {WELCOME_FIELD_LETTERS.map((item, idx) => (
                  <g
                    key={`f-main-${idx}`}
                    transform={`translate(${item.x}, ${item.y}) rotate(${item.rot})`}
                  >
                    <text
                      fill="url(#fieldLimeFill)"
                      stroke="#382110"
                      strokeWidth="13"
                      strokeLinejoin="round"
                      style={{ paintOrder: 'stroke fill' }}
                    >
                      {item.ch}
                    </text>
                  </g>
                ))}
              </g>
            </svg>
          )}

          {/* Mission Pitch */}
          <p className="mt-1 sm:mt-2 text-xs sm:text-[13px] font-extrabold text-[#4B1C08] leading-snug text-balance max-w-[490px]">
            {t.pitchText}
          </p>

          {/* If custom city active, show custom badge */}
          {customCityConfig?.customCity && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2ea836] border-2 border-[#145a1a] shadow-sm text-white text-xs font-bold animate-pulse">
              <span>📍</span>
              <span>
                {lang === 'zh' ? '当前定制街区：' : 'Active Custom City: '}
                <strong>{customCityConfig.customCity.cityName}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Row 2: Three Objective Cards */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 items-stretch gap-2.5 sm:gap-3 text-center pt-0.5">
          {/* Card 1 */}
          <div className="relative rounded-[20px] bg-gradient-to-b from-[#DF682E] via-[#C84A1B] to-[#AE3911] border-[3px] border-[#7D240B] shadow-[inset_0_2px_0_rgba(255,190,145,0.5),inset_0_-4px_0_#8F2B0E,0_4px_0_rgba(72,22,6,0.3)] px-3 py-2.5 flex flex-col items-center justify-start gap-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-b from-[#7BE0FF] to-[#2B89BA] border-[2px] border-[#5C230C] flex items-center justify-center shrink-0">
              <span className="text-base">📦</span>
            </div>
            <div
              style={{ fontFamily: "'Skranji', 'Lilita One', cursive" }}
              className="text-[#FFF8E3] text-sm sm:text-[15px] leading-tight font-bold drop-shadow-[0_2px_0_#6B1E08]"
            >
              {t.card1Title}
            </div>
            <p className="text-[#FFF6DE] text-[11px] leading-snug font-bold text-balance drop-shadow-[0_1.5px_0_rgba(74,20,5,0.85)]">
              {t.card1Desc}
            </p>
          </div>

          {/* Card 2 */}
          <div className="relative rounded-[20px] bg-gradient-to-b from-[#DF682E] via-[#C84A1B] to-[#AE3911] border-[3px] border-[#7D240B] shadow-[inset_0_2px_0_rgba(255,190,145,0.5),inset_0_-4px_0_#8F2B0E,0_4px_0_rgba(72,22,6,0.3)] px-3 py-2.5 flex flex-col items-center justify-start gap-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-b from-[#7BE0FF] to-[#2B89BA] border-[2px] border-[#5C230C] flex items-center justify-center shrink-0">
              <span className="text-base">🎯</span>
            </div>
            <div
              style={{ fontFamily: "'Skranji', 'Lilita One', cursive" }}
              className="text-[#FFF8E3] text-sm sm:text-[15px] leading-tight font-bold drop-shadow-[0_2px_0_#6B1E08]"
            >
              {t.card2Title}
            </div>
            <p className="text-[#FFF6DE] text-[11px] leading-snug font-bold text-balance drop-shadow-[0_1.5px_0_rgba(74,20,5,0.85)]">
              {t.card2Desc}
            </p>
          </div>

          {/* Card 3 */}
          <div className="relative rounded-[20px] bg-gradient-to-b from-[#DF682E] via-[#C84A1B] to-[#AE3911] border-[3px] border-[#7D240B] shadow-[inset_0_2px_0_rgba(255,190,145,0.5),inset_0_-4px_0_#8F2B0E,0_4px_0_rgba(72,22,6,0.3)] px-3 py-2.5 flex flex-col items-center justify-start gap-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-b from-[#7BE0FF] to-[#2B89BA] border-[2px] border-[#5C230C] flex items-center justify-center shrink-0">
              <span className="text-base">⭐</span>
            </div>
            <div
              style={{ fontFamily: "'Skranji', 'Lilita One', cursive" }}
              className="text-[#FFF8E3] text-sm sm:text-[15px] leading-tight font-bold drop-shadow-[0_2px_0_#6B1E08]"
            >
              {t.card3Title}
            </div>
            <p className="text-[#FFF6DE] text-[11px] leading-snug font-bold text-balance drop-shadow-[0_1.5px_0_rgba(74,20,5,0.85)]">
              {t.card3Desc}
            </p>
          </div>
        </div>

        {/* Row 3: Controls row */}
        <div className="relative z-10 flex sm:hidden items-center justify-center text-center text-[11px] font-extrabold text-[#4B1C08]">
          <span>{t.controlsTouch}</span>
        </div>
        <div className="relative z-10 hidden sm:flex flex-nowrap items-center justify-center gap-x-2 text-center text-xs font-extrabold text-[#4B1C08]">
          <span>
            <span className="text-[#9E2B0A]">W/↑</span> {t.controlsDesktopDrive}
          </span>
          <span className="text-[#8B4C20]">·</span>
          <span>
            <span className="text-[#9E2B0A]">S/↓</span> {t.controlsDesktopBrake}
          </span>
          <span className="text-[#8B4C20]">·</span>
          <span>
            <span className="text-[#9E2B0A]">A/D</span> {t.controlsDesktopTurn}
          </span>
          <span className="text-[#8B4C20]">·</span>
          <span>
            <span className="text-[#9E2B0A]">Space</span> {t.controlsDesktopDrop}
          </span>
          <span className="text-[#8B4C20]">·</span>
          <span>
            <span className="text-[#9E2B0A]">Shift</span> {t.controlsDesktopBoost}
          </span>
          <span className="text-[#8B4C20]">·</span>
          <span>
            <span className="text-[#9E2B0A]">Q</span> {t.controlsDesktopHorn}
          </span>
        </div>


        {/* Row 4: Comfort settings — camera framing + handling feel */}
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-[18px] border-[3px] border-[#8B290D]/35 bg-[#FFF3D6]/85 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-extrabold text-[#8B4C20]">
              {lang === 'zh' ? '视角' : 'View'}
            </span>
            {VIEW_MODES.map((mode) => {
              const active = viewMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => pickView(mode)}
                  className={`rounded-[10px] border-[2px] px-2 py-0.5 text-[11px] font-extrabold transition ${
                    active
                      ? 'border-[#8B290D] bg-[#FFB800] text-[#4B1C08] shadow-[0_2px_0_#8B290D]'
                      : 'border-[#8B290D]/35 bg-[#FFFCF5] text-[#8B4C20] hover:bg-[#FFF0C2]'
                  }`}
                  aria-pressed={active}
                >
                  {lang === 'zh' ? VIEW_MODE_LABELS[mode].zh : VIEW_MODE_LABELS[mode].en}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-extrabold text-[#8B4C20]">
              {lang === 'zh' ? '手感' : 'Handling'}
            </span>
            {HANDLING_PRESETS.map((preset) => {
              const active = handling === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => pickHandling(preset)}
                  className={`rounded-[10px] border-[2px] px-2 py-0.5 text-[11px] font-extrabold transition ${
                    active
                      ? 'border-[#8B290D] bg-[#FFB800] text-[#4B1C08] shadow-[0_2px_0_#8B290D]'
                      : 'border-[#8B290D]/35 bg-[#FFFCF5] text-[#8B4C20] hover:bg-[#FFF0C2]'
                  }`}
                  aria-pressed={active}
                >
                  {lang === 'zh' ? HANDLING_LABELS[preset].zh : HANDLING_LABELS[preset].en}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 4: Daily challenge */}
        {daily ? (
          <div className="relative z-10 flex items-center justify-between gap-2 rounded-[18px] border-[3px] border-[#8B290D]/50 bg-[#FFF3D6]/90 px-3 py-2">
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] font-extrabold text-[#9E2B0A]">
                {(lang === 'zh' ? '每日挑战' : 'Daily Challenge') + ' · ' + daily.dateKey}
              </span>
              <span className="text-[11px] font-extrabold text-[#4B1C08]">
                {(lang === 'zh'
                  ? '目标 ' + daily.targetScore + ' 分 · 奖励 ' + daily.rewardCoins + ' 币'
                  : 'Target ' + daily.targetScore + ' pts · Reward ' + daily.rewardCoins + ' coins') +
                  (daily.cleared
                    ? lang === 'zh'
                      ? ' · 今日已达成'
                      : ' · cleared today'
                    : daily.bestScore > 0
                      ? (lang === 'zh' ? ' · 最佳 ' : ' · best ') + daily.bestScore
                      : '')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                pokoAudio.playUiClick();
                onStartDaily?.();
              }}
              className="arcade-btn-green h-[42px] px-4 rounded-[16px] flex items-center justify-center cursor-pointer transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0.5"
            >
              <span
                style={{ fontFamily: "'Skranji', 'Lilita One', cursive" }}
                className="text-[#FFF8E3] text-sm font-bold tracking-wide"
              >
                {lang === 'zh' ? '挑战' : 'Play'}
              </span>
            </button>
          </div>
        ) : null}
        {/* Row 4: Action Buttons (Custom Map Generator & Start Game) */}
        <div className="relative z-10 flex flex-col sm:flex-row gap-2.5 mt-0.5">
          {/* Custom City Generator Modal Trigger Button */}
          <button
            type="button"
            onClick={() => {
              pokoAudio.playUiClick();
              onOpenCustomCity();
            }}
            className="arcade-btn-cream sm:w-1/2 h-[56px] sm:h-[62px] rounded-[22px] flex items-center justify-center gap-2 cursor-pointer transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-1"
          >
            <span className="text-xl">🗺️</span>
            <span
              style={{ fontFamily: "'Skranji', 'Lilita One', cursive" }}
              className="arcade-stroke-sm text-white text-base sm:text-lg font-bold tracking-wide"
            >
              {t.customMapBtn}
            </span>
          </button>

          {/* Primary Big Start Button */}
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              pokoAudio.playUiClick();
              onStart();
            }}
            className="group relative sm:w-1/2 h-[56px] sm:h-[62px] rounded-[22px] bg-gradient-to-b from-[#F8843E] via-[#E85D25] to-[#CE4316] border-[3.5px] border-[#8B290D] shadow-[inset_0_3px_0_rgba(255,198,150,0.62),inset_0_-5px_0_#A33210,0_5px_0_rgba(88,28,8,0.38)] flex items-center justify-center cursor-pointer whitespace-nowrap transition-transform duration-150 ease-out hover:-translate-y-0.5 hover:brightness-105 active:translate-y-1"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <span className="text-xl">🚗</span>
              <span
                style={{ fontFamily: "'Skranji', 'Lilita One', cursive" }}
                className="text-[#FFF8E3] text-xl sm:text-2xl font-bold tracking-[0.06em] drop-shadow-[0_3px_0_#8B290D] group-hover:scale-[1.02] transition-transform"
              >
                {t.startGame}
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
