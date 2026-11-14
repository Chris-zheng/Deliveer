import React from 'react';
import { ParcelKind } from '../../game/types';
import type { HudState } from '../../game/types';
import type { I18nTable } from './view';
import { touchControls } from '../../game/touchControls';
import { triggerWindowKeyPulse } from './utils';
import { CustomerPortraitSvg } from './CustomerPortrait';
import { RedAlertBadge } from './RedAlertBadge';
import { archetypeLabel } from '../../game/archetypes';

export interface MobileDeckProps {
  hud: HudState;
  t: I18nTable;
  lang: 'zh' | 'en';
  muted: boolean;
  hasFreeSpin: boolean;
  boostPct: number;
  streakMultiplier: number;
  compassDeg: number;
  activeRewardPoints: number;
  showMobileBanner: boolean;
  isPreGoCountdown: boolean;
  steerRockerRef: React.RefObject<HTMLDivElement | null>;
  steerPointerIdRef: React.MutableRefObject<number | null>;
  gasPointerIdRef: React.MutableRefObject<number | null>;
  brakePointerIdRef: React.MutableRefObject<number | null>;
  steerUiSide: 'none' | 'left' | 'right';
  gasPressed: boolean;
  brakePressed: boolean;
  setGasPressed: React.Dispatch<React.SetStateAction<boolean>>;
  setBrakePressed: React.Dispatch<React.SetStateAction<boolean>>;
  updateSteerFromClientX: (clientX: number) => void;
  releaseSteerRocker: () => void;
  onToggleMute: () => void;
  onToggleLang?: () => void;
  onOpenShop: () => void;
}

export const MobileDeck: React.FC<MobileDeckProps> = (p) => {
  const {
    hud,
    t,
    lang,
    muted,
    hasFreeSpin,
    boostPct,
    streakMultiplier,
    compassDeg,
    activeRewardPoints,
    showMobileBanner,
    isPreGoCountdown,
    steerRockerRef,
    steerPointerIdRef,
    gasPointerIdRef,
    brakePointerIdRef,
    steerUiSide,
    gasPressed,
    brakePressed,
    setGasPressed,
    setBrakePressed,
    updateSteerFromClientX,
    releaseSteerRocker,
    onToggleMute,
    onToggleLang,
    onOpenShop,
  } = p;
  return (
    <>
<div
          className={`${
            isPreGoCountdown ? 'hidden' : 'flex md:hidden'
          } pointer-events-auto flex-col gap-1.5 w-full touch-none`}
        >
          {/* Mobile Street Sign & Live Rider Earnings Strip */}
          <div className="pointer-events-none self-center flex items-center gap-1.5 flex-wrap justify-center max-w-[96%]">
            {hud.currentStreetName && (
              <span className="bg-[#165dff] border-[1.5px] border-white ring-1 ring-[#140c04] rounded-lg px-2 py-0.5 text-[10px] font-extrabold text-white leading-none">
                <MapPinIcon className="mr-0.5" />
                {lang === 'en' ? hud.currentStreetNameEn || hud.currentStreetName : hud.currentStreetName}
              </span>
            )}
            <span className="arcade-pill-brown rounded-full px-2 py-0.5 text-[10px] font-extrabold text-[#6bf25c] leading-none tabular-nums">
              ¥{(hud.deliveryIncomeYuan ?? 0).toFixed(1)} · ★{(hud.customerReviewScore ?? 5.0).toFixed(1)}
            </span>
            {hud.lastEarningEvent && (
              <span
                key={`mearn-${hud.lastEarningEvent.id}`}
                className={`${
                  hud.lastEarningEvent.isReward ? 'bg-[#16a34a]' : 'bg-[#e11d48]'
                } border border-[#140c04] rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white leading-none`}
              >
                {hud.lastEarningEvent.amountYuan >= 0 ? '+' : '-'}¥
                {Math.abs(hud.lastEarningEvent.amountYuan).toFixed(1)} {hud.lastEarningEvent.label}
              </span>
            )}
          </div>

          {/* Compact Bottom-Tucked Status Chip (keeps vertical center & forward 3D road 100% unobstructed!) */}
          {(hud.isWrongWay || (showMobileBanner && hud.bannerEvent)) && (
            <div className="pointer-events-none self-center max-w-[92%]">
              {hud.isWrongWay ? (
                <div className="arcade-pill-brown border-[#1d1205] rounded-full px-2.5 py-0.5 flex items-center gap-1.5 whitespace-nowrap">
                  <span className="arcade-stroke-sm text-[#ff4d5a] text-[11px] leading-none">
                    {t.wrongWayWarning}
                  </span>
                  <span className="w-10 h-2 bg-black/50 rounded-full overflow-hidden border border-[#1d1205]">
                    <span
                      className="block h-full arcade-bar-gold transition-all duration-75"
                      style={{
                        width: `${Math.round(Math.min(100, hud.wrongWayProgress * 100))}%`,
                      }}
                    />
                  </span>
                </div>
              ) : hud.bannerEvent ? (
                <div
                  key={hud.bannerEvent.id}
                  className="bg-[#493214]/95 border-2 border-[#1d1205] rounded-full px-2.5 py-0.5 flex items-center gap-1.5 truncate shadow-sm"
                >
                  <span
                    className={`arcade-stroke-sm text-[11px] leading-none shrink-0 ${
                      hud.bannerEvent.tone === 'emerald'
                        ? 'text-[#6bf25c]'
                        : hud.bannerEvent.tone === 'amber'
                          ? 'text-[#ffee1f]'
                          : 'text-[#ff5c6a]'
                    }`}
                  >
                    {hud.bannerEvent.label}
                  </span>
                </div>
              ) : null}
            </div>
          )}

          {/* Upper Compact Strip: [Mute] + [Lang] + [Horn] + [Tap-to-Deliver Active Stop Card] + [Shop Icon] */}
          <div className="flex items-center gap-1.5 w-full">
            {onToggleLang && (
              <button
                type="button"
                tabIndex={-1}
                aria-label={t.languageSwitch}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleLang();
                }}
                className="arcade-circle-btn w-11 h-11 rounded-full flex items-center justify-center shrink-0 cursor-pointer text-white font-display text-xs"
              >
                {lang === 'zh' ? '中' : 'EN'}
              </button>
            )}
            <button
              type="button"
              tabIndex={-1}
              aria-label={muted ? 'Unmute audio' : 'Mute audio'}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              className="arcade-circle-btn w-11 h-11 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
            >
              {muted ? (
                <svg viewBox="0 0 28 28" className="w-6 h-6" fill="none">
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
                <svg viewBox="0 0 28 28" className="w-6 h-6" fill="none">
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

            <button
              type="button"
              tabIndex={-1}
              aria-label="Honk musical horn"
              onPointerDown={(e) => {
                e.preventDefault();
                touchControls.hornPulse = true;
              }}
              className="arcade-circle-btn w-11 h-11 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
            >
              <svg viewBox="0 0 28 28" className="w-6 h-6" fill="none" aria-hidden="true">
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
              aria-label="Tap to deliver parcel to active stop"
              onPointerDown={(e) => {
                e.preventDefault();
                touchControls.deliverPulse = true;
              }}
              className={`${
                hud.canExpressToss ? 'arcade-btn-green' : 'arcade-btn-gold'
              } flex-1 min-w-0 rounded-2xl px-2.5 py-1.5 flex items-center justify-between gap-2 cursor-pointer`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="hidden sm:flex shrink-0"><CustomerPortraitSvg appearance={hud.nextStopAppearance} /></span>
                <div className="text-left min-w-0">
                  <div className="font-display text-[11px] sm:text-xs text-[#2b1b08] leading-tight truncate">
                    #{hud.nextStopIndex} {hud.nextCustomerName}
                    {hud.nextVipRole !== 'none' ? ' ★' : ''}
                    {hud.nextArchetype !== 'chill'
                      ? ' · ' + archetypeLabel(hud.nextArchetype, lang ?? 'zh')
                      : ''}
                    {hud.rushPromiseSec > 0
                      ? ' · 加急 ' + hud.rushPromiseSec.toFixed(1) + 's'
                      : ''}
                      <span className="hidden sm:inline">{hud.targetStreetName ? ' · ' + (lang === 'en' ? hud.targetStreetNameEn || hud.targetStreetName : hud.targetStreetName) : ''}</span>
                  </div>
                  <div className="arcade-stroke-sm text-white text-[10px] sm:text-[11px] leading-tight truncate">
                    {hud.needsBrakeForLarge
                      ? `HOLD BRAKE · +${activeRewardPoints}`
                      : hud.canBullseyeToss
                        ? `BULLSEYE TAP! +${activeRewardPoints + 85}`
                        : hud.canExpressToss
                          ? `TAP TO DELIVER! +${activeRewardPoints}`
                          : `${
                              hud.nextParcelKind === ParcelKind.Large
                                ? 'CRATE'
                                : hud.nextParcelKind === ParcelKind.HotExpress
                                  ? `HOT ${Math.round(hud.thermalPct * 100)}%`
                                  : hud.nextParcelKind === ParcelKind.Fragile
                                    ? hud.fragileIntact
                                      ? 'FRAGILE'
                                      : 'BUMPED'
                                    : 'PARCEL'
                            } · +${activeRewardPoints}`}
                  </div>
                </div>
              </div>

              {hud.deliveredCount < hud.totalStops && (
                <div className="flex items-center gap-0.5 sm:gap-1 bg-[#493214] border-2 border-[#140c04] rounded-xl px-1.5 sm:px-2 py-0.5 sm:py-1 shrink-0">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform duration-100"
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
                  <span className="arcade-stroke-sm text-white text-[11px] sm:text-xs leading-none whitespace-nowrap">
                    {hud.distanceToStopMeters}m
                  </span>
                </div>
              )}
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Open garage shop"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenShop();
              }}
              className="flex flex-col items-center justify-center min-w-[46px] min-h-[46px] cursor-pointer relative shrink-0"
            >
              {hasFreeSpin && <RedAlertBadge />}
              <svg
                viewBox="0 0 60 52"
                className="w-11 h-9 drop-shadow-sm"
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
            </button>
          </div>

          {/* Lower Dual-Thumb Arcade Driving Row: [◀ STEER RIGHT ▶] + [BOOST] + [BRAKE ▼ | DRIVE ▲] */}
          <div className="flex items-stretch gap-1.5 w-full">
            {/* Left Thumb Slide-Capable Steering Rocker */}
            <div
              ref={steerRockerRef}
              role="group"
              aria-label="Steering controls"
              onPointerDown={(e) => {
                e.preventDefault();
                steerPointerIdRef.current = e.pointerId;
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                  // Ignore synthetic pointer events without active pointerId
                }
                touchControls.steerTouchActive = true;
                updateSteerFromClientX(e.clientX);
              }}
              onPointerMove={(e) => {
                if (steerPointerIdRef.current !== e.pointerId) return;
                updateSteerFromClientX(e.clientX);
              }}
              onPointerUp={(e) => {
                if (steerPointerIdRef.current !== e.pointerId) return;
                releaseSteerRocker();
              }}
              onPointerCancel={(e) => {
                if (steerPointerIdRef.current !== e.pointerId) return;
                releaseSteerRocker();
              }}
              className="flex-[1.2] grid grid-cols-2 gap-1.5 touch-none"
            >
              <button
                type="button"
                tabIndex={-1}
                aria-label="Steer left"
                className={`arcade-btn-gold h-[56px] rounded-2xl flex items-center justify-center cursor-pointer transition-transform ${
                  steerUiSide === 'left' ? 'translate-y-0.5 brightness-110' : ''
                }`}
              >
                <span className="arcade-stroke-sm text-white text-[10px] sm:text-xs whitespace-nowrap">LEFT</span>
              </button>

              <button
                type="button"
                tabIndex={-1}
                aria-label="Steer right"
                className={`arcade-btn-gold h-[56px] rounded-2xl flex items-center justify-center cursor-pointer transition-transform ${
                  steerUiSide === 'right' ? 'translate-y-0.5 brightness-110' : ''
                }`}
              >
                <span className="arcade-stroke-sm text-white text-[10px] sm:text-xs whitespace-nowrap">RIGHT</span>
              </button>
            </div>

            {/* Center Thumb Drift + Turbo Boost Stack */}
            <div className="flex flex-col gap-1 shrink-0 min-w-[62px] sm:min-w-[78px]">
              <button
                type="button"
                tabIndex={-1}
                aria-label="Hold drift for mini-turbo"
                onPointerDown={(e) => {
                  e.preventDefault();
                  touchControls.drift = true;
                }}
                onPointerUp={() => {
                  touchControls.drift = false;
                }}
                onPointerCancel={() => {
                  touchControls.drift = false;
                }}
                onPointerLeave={() => {
                  touchControls.drift = false;
                }}
                className={`rounded-xl border-2 border-[#1d1205] h-[22px] flex items-center justify-center cursor-pointer transition ${
                  hud.driftTier === 2
                    ? 'bg-[#facc15] text-[#140c04]'
                    : hud.driftTier === 1
                      ? 'bg-[#38bdf8] text-[#082f49]'
                      : 'bg-[#493214] text-amber-100'
                }`}
              >
                <span className="text-[9px] font-extrabold leading-none">
                  {hud.driftTier === 2 ? 'MAX DRIFT' : hud.driftTier === 1 ? 'TURBO!' : 'DRIFT'}
                </span>
              </button>
              <button
                type="button"
                tabIndex={-1}
                aria-label="Activate mobile turbo boost"
                onPointerDown={(e) => {
                  e.preventDefault();
                  touchControls.boostPulse = true;
                }}
                className="arcade-boost-rim rounded-xl p-0.5 h-[30px] flex items-stretch cursor-pointer"
              >
                <div className="bg-[#493214] border-2 border-[#1d1205] rounded-lg px-2 w-full relative overflow-hidden flex items-center justify-center gap-1">
                  {!hud.boostReady && !hud.isBoosting && (
                    <div
                      className="absolute left-0 top-0 bottom-0 bg-amber-400/30 transition-all duration-100"
                      style={{ width: `${boostPct}%` }}
                    />
                  )}
                  <span
                    className={`relative z-10 arcade-stroke-sm text-[10px] leading-none whitespace-nowrap ${
                      hud.isFever
                        ? 'text-[#ff70a6]'
                        : hud.isBoosting
                          ? 'text-[#6bf25c]'
                          : hud.boostReady
                            ? 'text-[#ffee1f]'
                            : 'text-amber-200/80'
                    }`}
                  >
                    {hud.isFever ? 'FEVER' : `x${streakMultiplier} BOOST`}
                  </span>
                </div>
              </button>
            </div>

            {/* Right Thumb Brake & Gas Pedals */}
            <div className="flex-[1.2] grid grid-cols-2 gap-1.5 touch-none">
              <button
                type="button"
                tabIndex={-1}
                aria-label="Hold brake"
                onPointerDown={(e) => {
                  e.preventDefault();
                  brakePointerIdRef.current = e.pointerId;
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch {
                    // Ignore synthetic pointer events
                  }
                  touchControls.brake = true;
                  setBrakePressed(true);
                }}
                onPointerUp={(e) => {
                  if (brakePointerIdRef.current !== e.pointerId) return;
                  brakePointerIdRef.current = null;
                  touchControls.brake = false;
                  setBrakePressed(false);
                }}
                onPointerCancel={(e) => {
                  if (brakePointerIdRef.current !== e.pointerId) return;
                  brakePointerIdRef.current = null;
                  touchControls.brake = false;
                  setBrakePressed(false);
                }}
                className={`arcade-btn-cream h-[56px] rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-transform ${
                  brakePressed ? 'translate-y-0.5 brightness-95' : ''
                }`}
              >
                <span className="arcade-stroke-sm text-[#ff5964] text-[10px] sm:text-xs leading-none whitespace-nowrap">
                  BRAKE
                </span>
                <span className="text-[9px] sm:text-[10px] font-extrabold text-[#493214] leading-tight mt-0.5 whitespace-nowrap">
                  STOP
                </span>
              </button>

              <button
                type="button"
                tabIndex={-1}
                aria-label="Hold gas pedal to drive"
                onPointerDown={(e) => {
                  e.preventDefault();
                  gasPointerIdRef.current = e.pointerId;
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch {
                    // Ignore synthetic pointer events
                  }
                  touchControls.gas = true;
                  setGasPressed(true);
                }}
                onPointerUp={(e) => {
                  if (gasPointerIdRef.current !== e.pointerId) return;
                  gasPointerIdRef.current = null;
                  touchControls.gas = false;
                  setGasPressed(false);
                }}
                onPointerCancel={(e) => {
                  if (gasPointerIdRef.current !== e.pointerId) return;
                  gasPointerIdRef.current = null;
                  touchControls.gas = false;
                  setGasPressed(false);
                }}
                className={`arcade-btn-green h-[56px] rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-transform ${
                  gasPressed ? 'translate-y-0.5 brightness-110' : ''
                }`}
              >
                <span className="arcade-stroke-sm text-white text-[11px] sm:text-sm leading-none whitespace-nowrap">
                  DRIVE
                </span>
                <span className="text-[9px] sm:text-[10px] font-extrabold text-[#0b3b12] leading-tight mt-0.5 whitespace-nowrap">
                  GO ▲
                </span>
              </button>
            </div>
          </div>
        </div>
    </>
  );
};
import { MapPinIcon } from './icons';
