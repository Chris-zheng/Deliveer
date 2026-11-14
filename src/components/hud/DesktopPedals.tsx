import React from 'react';
import { ParcelKind } from '../../game/types';
import type { HudState } from '../../game/types';
import type { I18nTable } from './view';
import { touchControls } from '../../game/touchControls';
import { triggerWindowKeyPulse } from './utils';
import { CustomerPortraitSvg } from './CustomerPortrait';
import { RedAlertBadge } from './RedAlertBadge';
import { archetypeLabel } from '../../game/archetypes';

export interface DesktopPedalsProps {
  hud: HudState;
  t: I18nTable;
  lang: 'zh' | 'en';
  muted: boolean;
  hasFreeSpin: boolean;
  compassDeg: number;
  activeRewardPoints: number;
  onToggleMute: () => void;
  onToggleLang?: () => void;
  onOpenShop: () => void;
}

export const DesktopPedals: React.FC<DesktopPedalsProps> = (p) => {
  const {
    hud,
    t,
    lang,
    muted,
    hasFreeSpin,
    compassDeg,
    activeRewardPoints,
    onToggleMute,
    onToggleLang,
    onOpenShop,
  } = p;
  return (
    <>
<div className="hidden md:flex pointer-events-auto items-end gap-5 mx-auto">
          <button
            type="button"
            tabIndex={-1}
            data-testid="hud-demo-timer-btn"
            aria-label={
              hud.demoActive
                ? 'Stop 45s demo reel [T]'
                : 'Start 45s demo reel [T]'
            }
            title={
              hud.demoActive
                ? 'Click to Stop Demo Reel [T / Esc]'
                : '45s Hands-Free Gameplay Demo Reel [T]'
            }
            onClick={(e) => {
              e.currentTarget.blur();
              touchControls.demoTogglePulse = true;
            }}
            className={`arcade-circle-btn w-15 h-15 rounded-full flex items-center justify-center shrink-0 cursor-pointer relative ${
              hud.demoActive ? 'ring-3 ring-[#6bf25c]' : ''
            }`}
          >
            <svg
              viewBox="0 0 36 36"
              className="w-10 h-10"
              fill="none"
              aria-hidden="true"
            >
              {/* Top Stopwatch Plunger & Side Clicker */}
              <path
                d="M14 4h8M18 4v3.5M26.5 8.5l2.2-2.2"
                stroke="#140c04"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              <path
                d="M14.5 4h7"
                stroke="#ffe524"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              {/* Stopwatch Body */}
              <circle
                cx="18"
                cy="20"
                r="12"
                fill={hud.demoActive ? '#2ea836' : '#ffe524'}
                stroke="#140c04"
                strokeWidth="2.8"
              />
              <circle
                cx="18"
                cy="20"
                r="9.2"
                fill={hud.demoActive ? '#1f7a26' : '#493214'}
              />
            </svg>
            <span className="absolute inset-0 pt-2 flex items-center justify-center arcade-stroke-sm text-white text-xs leading-none tabular-nums">
              {hud.demoActive ? `${hud.demoRemainingSec ?? 45}s` : '45s'}
            </span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'Unmute audio [M]' : 'Mute audio [M]'}
            title="Mute / Unmute [M]"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="arcade-circle-btn w-15 h-15 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
          >
            {muted ? (
              <svg viewBox="0 0 28 28" className="w-8 h-8" fill="none">
                <path
                  d="M13 6L7.5 10.5H4v7h3.5L13 22V6z"
                  fill="#ffffff"
                  stroke="#140c04"
                  strokeWidth="2.6"
                  strokeLinejoin="round"
                />
                <path
                  d="M24 10l-6 8M18 10l6 8"
                  stroke="#ff2430"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 28 28" className="w-8 h-8" fill="none">
                <path
                  d="M13 6L7.5 10.5H4v7h3.5L13 22V6z"
                  fill="#ffffff"
                  stroke="#140c04"
                  strokeWidth="2.6"
                  strokeLinejoin="round"
                />
                <path
                  d="M18 10a5.5 5.5 0 010 8M21.5 7a9.5 9.5 0 010 14"
                  stroke="#ffffff"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>

          {onToggleLang && (
            <button
              type="button"
              tabIndex={-1}
              aria-label={t.languageSwitch}
              title={t.languageSwitch}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleLang();
              }}
              className="arcade-circle-btn w-15 h-15 rounded-full flex items-center justify-center shrink-0 cursor-pointer text-white font-display text-base"
            >
              {lang === 'zh' ? '中' : 'EN'}
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            aria-label="Honk musical horn [Q]"
            title="Musical Horn [Q] — Calms Scooters & Hurries Ducklings!"
            onClick={(e) => {
              e.currentTarget.blur();
              touchControls.hornPulse = true;
              triggerWindowKeyPulse('KeyQ');
            }}
            className="arcade-circle-btn w-14 h-14 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
          >
            <svg viewBox="0 0 28 28" className="w-7 h-7" fill="none" aria-hidden="true">
              <path
                d="M6 12h4l8-5v14l-8-5H6a2 2 0 01-2-2v0a2 2 0 012-2z"
                fill="#ffe524"
                stroke="#140c04"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M21 10a5 5 0 010 8"
                stroke="#ffffff"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Deliver parcel to active stop [Space]"
            onClick={(e) => {
              e.currentTarget.blur();
              touchControls.deliverPulse = true;
              triggerWindowKeyPulse('Space');
            }}
            className={`${
              hud.canExpressToss ? 'arcade-btn-green' : 'arcade-btn-gold'
            } rounded-2xl px-5 pt-2.5 pb-2.5 min-w-[356px] flex flex-col gap-1.5 cursor-pointer relative`}
          >
            <div
              className="absolute -top-6 left-1/2 -translate-x-1/2 pointer-events-none flex items-center justify-center"
              aria-hidden="true"
            >
              <svg viewBox="0 0 56 56" className="w-12 h-12 drop-shadow-sm">
                <g stroke="#fff59d" strokeWidth="3" strokeLinecap="round" opacity="0.85">
                  <line x1="28" y1="3" x2="28" y2="9" />
                  <line x1="11" y1="10" x2="15" y2="14" />
                  <line x1="45" y1="10" x2="41" y2="14" />
                  <line x1="5" y1="24" x2="11" y2="24" />
                  <line x1="51" y1="24" x2="45" y2="24" />
                </g>
                <ellipse cx="28" cy="46" rx="11" ry="3.5" fill="rgba(20,12,4,0.28)" />
                <path
                  d="M28 11L13 18.5v16L28 42l15-7.5v-16L28 11z"
                  fill={
                    hud.nextParcelKind === ParcelKind.HotExpress
                      ? '#ef233c'
                      : hud.nextParcelKind === ParcelKind.Large
                        ? '#ff9f1c'
                        : hud.nextParcelKind === ParcelKind.Fragile
                          ? '#ff75a0'
                          : '#fff3b0'
                  }
                  stroke="#140c04"
                  strokeWidth="3.2"
                  strokeLinejoin="round"
                />
                <path
                  d="M13 18.5L28 26l15-7.5M28 26v16"
                  stroke="#140c04"
                  strokeWidth="2.6"
                  strokeLinejoin="round"
                />
                <path
                  d="M20.5 14.8l15 7.5"
                  stroke="#ffe524"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="flex items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-2 min-w-0">
                <CustomerPortraitSvg appearance={hud.nextStopAppearance} />
                <div className="text-left min-w-0">
                  <div className="font-display text-base text-[#2b1b08] leading-none truncate">
                    #{hud.nextStopIndex} {hud.nextCustomerName}
                    {hud.nextVipRole !== 'none' ? ' ★' : ''}
                    {hud.nextArchetype !== 'chill'
                      ? ' · ' + archetypeLabel(hud.nextArchetype, lang ?? 'zh')
                      : ''}
                    {hud.rushPromiseSec > 0
                      ? ' · 加急 ' + hud.rushPromiseSec.toFixed(1) + 's'
                      : ''}
                  </div>
                  <div className="text-[11px] font-extrabold text-[#5c3809] truncate mt-0.5 max-w-[195px]">
                    {hud.targetStreetName ? (
                      <>
                        <MapPinIcon className="mr-0.5" />
                        {(lang === 'en' ? hud.targetStreetNameEn || hud.targetStreetName : hud.targetStreetName) + ' · '}
                      </>
                    ) : null}
                    {hud.nextParcelKind === ParcelKind.HotExpress
                      ? `HOT (${Math.round(hud.thermalPct * 100)}%) · ${hud.nextParcelLabel}`
                      : hud.nextParcelLabel}
                  </div>
                </div>
              </div>

              {hud.deliveredCount < hud.totalStops && (
                <div className="flex items-center gap-1.5 bg-[#493214] border-[2.5px] border-[#140c04] rounded-xl px-2.5 py-1 shrink-0">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4 transition-transform duration-100"
                    style={{ transform: `rotate(${Math.round(compassDeg)}deg)` }}
                    aria-hidden="true"
                  >
                    <path
                      d="M12 2.5l6.5 16.5L12 15.2 5.5 19 12 2.5z"
                      fill="#ffee1f"
                      stroke="#140c04"
                      strokeWidth="2.2"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="arcade-stroke-sm text-white text-sm leading-none">
                    {hud.distanceToStopMeters}m
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 pt-0.5">
              <svg
                viewBox="0 0 28 28"
                className="w-6 h-6 shrink-0"
                aria-hidden="true"
              >
                <circle
                  cx="14"
                  cy="14"
                  r="11.5"
                  fill="#ffe524"
                  stroke="#140c04"
                  strokeWidth="2.8"
                />
                <circle cx="14" cy="14" r="8" fill="#df8f0d" />
                <path
                  d="M14 8v12M16.5 10.8c0-1.1-1.1-1.8-2.5-1.8s-2.5.7-2.5 1.7c0 2.4 5 1.5 5 4.1 0 1.2-1.1 1.9-2.5 1.9s-2.5-.7-2.5-1.8"
                  stroke="#ffe629"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>

              <span className="arcade-stroke-sm text-white text-lg leading-none whitespace-nowrap">
                {hud.needsBrakeForLarge
                  ? (lang === 'zh' ? `减速大件 [S/↓] · +${activeRewardPoints}` : `BRAKE [S/↓] · +${activeRewardPoints}`)
                  : hud.canBullseyeToss
                    ? (lang === 'zh' ? `精准正中 [空格]! · +${activeRewardPoints + 85}` : `BULLSEYE [SPACE]! · +${activeRewardPoints + 85}`)
                    : hud.canExpressToss
                      ? (lang === 'zh' ? `急速投递 [空格] · +${activeRewardPoints}` : `DELIVER [SPACE] · +${activeRewardPoints}`)
                      : hud.nextParcelKind === ParcelKind.Large
                        ? (lang === 'zh' ? `大号货箱 · +${activeRewardPoints}` : `LARGE CRATE · +${activeRewardPoints}`)
                        : hud.nextParcelKind === ParcelKind.HotExpress
                          ? (lang === 'zh' ? `趁热特快 · +${activeRewardPoints}` : `HOT EXPRESS · +${activeRewardPoints}`)
                          : hud.nextParcelKind === ParcelKind.Fragile
                            ? hud.fragileIntact
                              ? (lang === 'zh' ? `易碎包裹 · +${activeRewardPoints}` : `FRAGILE · +${activeRewardPoints}`)
                              : (lang === 'zh' ? `包裹受损 · +${activeRewardPoints}` : `BUMPED · +${activeRewardPoints}`)
                            : (lang === 'zh' ? `投递 [空格] · +${activeRewardPoints}` : `TOSS [SPACE] · +${activeRewardPoints}`)}
              </span>
            </div>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={t.garage}
            title={t.garage}
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenShop();
            }}
            className="flex flex-col items-center pb-1.5 cursor-pointer transition-transform hover:-translate-y-0.5 active:translate-y-0.5 shrink-0 relative"
          >
            {hasFreeSpin && <RedAlertBadge />}
            <svg
              viewBox="0 0 60 52"
              className="w-15 h-13 drop-shadow-sm"
              aria-hidden="true"
            >
              <rect
                x="9"
                y="22"
                width="42"
                height="26"
                rx="3"
                fill="#f8fafc"
                stroke="#140c04"
                strokeWidth="3.4"
              />
              <rect
                x="14"
                y="27"
                width="15"
                height="13"
                rx="2"
                fill="#29b6f6"
                stroke="#140c04"
                strokeWidth="2.6"
              />
              <rect
                x="34"
                y="27"
                width="11"
                height="21"
                rx="2"
                fill="#1e88e5"
                stroke="#140c04"
                strokeWidth="2.6"
              />
              <path
                d="M6 21L11 7h38l5 14a6 6 0 01-12 0 6 6 0 01-12 0 6 6 0 01-12 0 6 6 0 01-12 0z"
                fill="#ffffff"
                stroke="#140c04"
                strokeWidth="3.4"
                strokeLinejoin="round"
              />
              <path d="M6 21L11 7h9l-2 14a6 6 0 01-12 0z" fill="#ff3b24" />
              <path d="M30 21l-1-14h10l3 14a6 6 0 01-12 0z" fill="#ff3b24" />
              <path
                d="M6 21L11 7h38l5 14a6 6 0 01-12 0 6 6 0 01-12 0 6 6 0 01-12 0 6 6 0 01-12 0z"
                fill="none"
                stroke="#140c04"
                strokeWidth="3.4"
                strokeLinejoin="round"
              />
            </svg>
            <span className="-mt-2.5 arcade-stroke-sm text-white text-base uppercase leading-tight">
              {t.garage}
            </span>
          </button>
        </div>
    </>
  );
};
import { MapPinIcon } from './icons';
