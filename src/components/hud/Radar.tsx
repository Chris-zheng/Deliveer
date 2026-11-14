import React from 'react';
import type { HudState } from '../../game/types';
import type { I18nTable } from './view';

export interface RadarProps {
  hud: HudState;
  t: I18nTable;
  lang: 'zh' | 'en';
  isPreGoCountdown: boolean;
  mapCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export const Radar: React.FC<RadarProps> = (p) => {
  const { hud, t, lang, isPreGoCountdown, mapCanvasRef } = p;
  return (
    <>
        <div
          className={`${
            isPreGoCountdown ? 'hidden md:flex' : 'flex'
          } fixed right-2.5 top-[64px] md:static flex-col items-center arcade-pill-brown rounded-xl md:rounded-2xl p-1 md:p-1.5 shrink-0 z-10`}
        >
          <canvas
            ref={mapCanvasRef}
            width={106}
            height={106}
            data-testid="hud-minimap"
            aria-label="Courier GPS route minimap"
            className="block w-[72px] h-[72px] md:w-[106px] md:h-[106px] rounded-lg md:rounded-xl border-2 border-[var(--ink)]"
          />
          <div className="w-full flex items-center justify-between px-1 md:px-1.5 pt-0.5 md:pt-1">
            <span className="arcade-stroke-sm text-[var(--yellow)] text-xs md:text-xs leading-none">
              GPS
            </span>
            <span className="arcade-stroke-sm text-white text-xs md:text-xs leading-none">
              {hud.speedKmh} KM/H
            </span>
          </div>
        </div>
    </>
  );
};
