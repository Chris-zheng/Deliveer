import React, { useEffect, useId, useRef, useState } from 'react';
import { resetTouchControls, touchControls } from '../game/touchControls';
import {
  GeneratedCity,
  HazardKind,
  HudState,
  ParcelKind,
  PersonAppearance,
  SignalAxisState,
  TILE_SIZE,
  TileType,
} from '../game/types';

import type { MinimapSnapshot } from './hud/types';
import { CustomerPortraitSvg } from './hud/CustomerPortrait';
import { RedAlertBadge } from './hud/RedAlertBadge';
import { deriveHudMetrics } from './hud/selectors';
import { useMinimapRadar } from './hud/useMinimapRadar';
import { formatClock, toHexColor, triggerWindowKeyPulse } from './hud/utils';
import { archetypeLabel } from '../game/archetypes';
import { CenterStrip } from './hud/CenterStrip';
import { DesktopPedals } from './hud/DesktopPedals';
import { MobileDeck } from './hud/MobileDeck';
import { Countdown } from './hud/Countdown';
import { Radar } from './hud/Radar';
import { TopColumns } from './hud/TopColumns';
import { TopRight } from './hud/TopRight';

export type { MinimapSnapshot };

import { I18N, SupportedLanguage } from '../game/i18n';

interface GameHudProps {
  hud: HudState;
  minimapRef: React.RefObject<MinimapSnapshot>;
  muted: boolean;
  lang?: SupportedLanguage;
  hasClaimableQuest: boolean;
  hasFreeSpin: boolean;
  onToggleMute: () => void;
  onToggleLang?: () => void;
  onPause: () => void;
  onOpenQuests: () => void;
  onOpenShop: () => void;
  onRestart: () => void;
}




export const GameHud: React.FC<GameHudProps> = ({
  hud,
  minimapRef,
  muted,
  lang = 'zh',
  hasClaimableQuest,
  hasFreeSpin,
  onToggleMute,
  onToggleLang,
  onPause,
  onOpenQuests,
  onOpenShop,
  onRestart,
}) => {
  const t = I18N[lang ?? 'zh'];
  const starClipId = useId();
  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const steerRockerRef = useRef<HTMLDivElement | null>(null);
  const steerPointerIdRef = useRef<number | null>(null);
  const gasPointerIdRef = useRef<number | null>(null);
  const brakePointerIdRef = useRef<number | null>(null);

  // Discrete pressed visual state for mobile touch buttons (updates only on press/release)
  const [steerUiSide, setSteerUiSide] = useState<'none' | 'left' | 'right'>('none');
  const [gasPressed, setGasPressed] = useState(false);
  const [brakePressed, setBrakePressed] = useState(false);

  useEffect(() => {
    return () => {
      resetTouchControls();
    };
  }, []);

  const updateSteerFromClientX = (clientX: number) => {
    const el = steerRockerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const norm = ((clientX - rect.left) / rect.width) * 2 - 1; // -1 .. +1
    if (Math.abs(norm) < 0.08) {
      touchControls.steerAnalog = 0;
      touchControls.steerLeft = false;
      touchControls.steerRight = false;
      setSteerUiSide('none');
    } else if (norm < 0) {
      const mag = Math.min(1, Math.max(0.45, Math.abs(norm) * 1.25));
      touchControls.steerAnalog = -mag;
      touchControls.steerLeft = true;
      touchControls.steerRight = false;
      setSteerUiSide('left');
    } else {
      const mag = Math.min(1, Math.max(0.45, Math.abs(norm) * 1.25));
      touchControls.steerAnalog = mag;
      touchControls.steerLeft = false;
      touchControls.steerRight = true;
      setSteerUiSide('right');
    }
  };

  const releaseSteerRocker = () => {
    steerPointerIdRef.current = null;
    touchControls.steerTouchActive = false;
    touchControls.steerAnalog = 0;
    touchControls.steerLeft = false;
    touchControls.steerRight = false;
    setSteerUiSide('none');
  };

  const {
    isLowTime,
    isCriticalHealth,
    deliveryPct,
    boostPct,
    streakMultiplier,
    compassDeg,
    isPreGoCountdown,
    showMobileBanner,
    activeRewardPoints,
  } = deriveHudMetrics(hud);

  // Lightweight 10Hz 2D Canvas Heading-Up GPS Radar
  useMinimapRadar(mapCanvasRef, minimapRef);

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4 select-none">
      {/* Subtle low-HP warm peripheral border cue */}
      {isCriticalHealth && (
        <div
          className="fixed inset-0 pointer-events-none border-8 border-rose-500/45 rounded-none"
          aria-hidden="true"
        />
      )}

      {/* TOP ROW: Reference 1 Resource Pills + Center Desktop Alerts + Reference 2 Top-Right Boost & Clock (Hidden on Mobile during 3-2-1!) */}
      <div
        className={`${
          isPreGoCountdown ? 'hidden md:flex' : 'flex'
        } flex-col gap-1.5`}
      >
        <div className="flex items-start justify-between gap-1.5 sm:gap-2">
          {/* LEFT COLUMN: Reference 1 Top-Left Resource Pills + Reference 4 Left-Edge Dock Buttons */}
          <TopColumns
            hud={hud}
            t={t}
            lang={lang}
            starClipId={starClipId}
            deliveryPct={deliveryPct}
            isCriticalHealth={isCriticalHealth}
            onPause={onPause}
            onRestart={onRestart}
            onOpenQuests={onOpenQuests}
            hasClaimableQuest={hasClaimableQuest}
          />

          {/* CENTER EPHEMERAL CALLOUTS & STREET/RIDER BAR ON DESKTOP (md+) */}
          <CenterStrip hud={hud} t={t} lang={lang} />

          {/* TOP-RIGHT: Reference 2 Golden-Rimmed BOOST Capsule (md+) + Outlined White Clock Timer */}
          <TopRight
            hud={hud}
            t={t}
            lang={lang}
            boostPct={boostPct}
            streakMultiplier={streakMultiplier}
            isLowTime={isLowTime}
          />
        </div>
      </div>

      {/* CENTER STORYBOOK 3 - 2 - 1 - GO! COUNTDOWN & ROCKET START OVERLAY */}
      {hud.countdownStage !== null && hud.countdownStage !== undefined && (
        <Countdown hud={{ ...hud, countdownStage: hud.countdownStage }} t={t} lang={lang} />
      )}

      {/* BOTTOM PERIMETER: Desktop Action Trio (md+) + Mobile Dual-Thumb Arcade Deck (<md) + Responsive GPS Radar */}
      <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-2 md:gap-3">
        {/* Left spacer on desktop so the Reference 3 action trio sits centered across the bottom! */}
        <div className="hidden lg:block w-[122px] shrink-0" aria-hidden="true" />

        {/* DESKTOP BOTTOM ACTION BAR (md+) */}
                <DesktopPedals
          hud={hud}
          t={t}
          lang={lang}
          muted={muted}
          hasFreeSpin={hasFreeSpin}
          compassDeg={compassDeg}
          activeRewardPoints={activeRewardPoints}
          onToggleMute={onToggleMute}
          onToggleLang={onToggleLang}
          onOpenShop={onOpenShop}
        />

        {/* MOBILE DUAL-THUMB ARCADE TOUCH DECK (< md): Hidden during 3-2-1, appears cleanly on GO! */}
                <MobileDeck
          hud={hud}
          t={t}
          lang={lang}
          muted={muted}
          hasFreeSpin={hasFreeSpin}
          boostPct={boostPct}
          streakMultiplier={streakMultiplier}
          compassDeg={compassDeg}
          activeRewardPoints={activeRewardPoints}
          showMobileBanner={showMobileBanner}
          isPreGoCountdown={isPreGoCountdown}
          steerRockerRef={steerRockerRef}
          steerPointerIdRef={steerPointerIdRef}
          gasPointerIdRef={gasPointerIdRef}
          brakePointerIdRef={brakePointerIdRef}
          steerUiSide={steerUiSide}
          gasPressed={gasPressed}
          brakePressed={brakePressed}
          setGasPressed={setGasPressed}
          setBrakePressed={setBrakePressed}
          updateSteerFromClientX={updateSteerFromClientX}
          releaseSteerRocker={releaseSteerRocker}
          onToggleMute={onToggleMute}
          onToggleLang={onToggleLang}
          onOpenShop={onOpenShop}
        />

        {/* Heading-Up GPS Radar: Upper-Right under clock on Mobile (<md, hidden during 3-2-1), Bottom-Right on Desktop (md+) */}
        <Radar hud={hud} t={t} lang={lang} isPreGoCountdown={isPreGoCountdown} mapCanvasRef={mapCanvasRef} />
      </div>
    </div>
  );
};
