/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { pokoAudio } from '../game/audio';
import { I18N, SupportedLanguage } from '../game/i18n';
import {
  CONTINENTS,
  ContinentId,
  WORLD_CITIES,
  WorldCityDef,
  buildWorldCityLevelConfig,
  getCityEarnedStars,
  getTotalWorldStars,
  isWorldCityUnlocked,
} from '../game/worldCities';
import { LevelConfig, PlayerProgression } from '../game/types';

interface WorldMapModalProps {
  open: boolean;
  lang: SupportedLanguage;
  progression: PlayerProgression;
  onSelectWorldStage: (cfg: LevelConfig) => void;
  onClose: () => void;
}

export const WorldMapModal: React.FC<WorldMapModalProps> = ({
  open,
  lang,
  progression,
  onSelectWorldStage,
  onClose,
}) => {
  const [continentFilter, setContinentFilter] = useState<'all' | ContinentId>('all');
  const [selectedCityId, setSelectedCityId] = useState<string>('beijing');
  const [selectedStage, setSelectedStage] = useState<number>(1);

  const totalStars = useMemo(() => getTotalWorldStars(progression), [progression]);

  const filteredCities = useMemo(
    () =>
      continentFilter === 'all'
        ? WORLD_CITIES
        : WORLD_CITIES.filter((c) => c.continent === continentFilter),
    [continentFilter],
  );

  const activeCity: WorldCityDef =
    WORLD_CITIES.find((c) => c.id === selectedCityId) ?? filteredCities[0] ?? WORLD_CITIES[0];

  if (!open) return null;

  const t = I18N[lang];
  const cityUnlocked = isWorldCityUnlocked(activeCity, progression);
  const activeStageDef =
    activeCity.stages.find((s) => s.stage === selectedStage) ?? activeCity.stages[0];

  const isStagePlayable = (stageNum: number): boolean => {
    if (!cityUnlocked) return false;
    if (stageNum <= 1) return true;
    const prevKey = `${activeCity.id}:${stageNum - 1}`;
    return (progression.worldCityStars[prevKey] ?? 0) > 0;
  };

  const handleLaunchStage = () => {
    if (!isStagePlayable(activeStageDef.stage)) return;
    pokoAudio.playUiClick();
    const cfg = buildWorldCityLevelConfig(activeCity, activeStageDef.stage);
    onSelectWorldStage(cfg);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-2.5 sm:p-5 bg-black/65 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="world-map-heading"
    >
      <div className="pointer-events-auto arcade-panel rounded-[28px] p-4 sm:p-6 w-full max-w-4xl max-h-[93vh] overflow-hidden flex flex-col gap-3.5">
        {/* Header */}
        <div className="arcade-pill-brown rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div>
            <h2
              id="world-map-heading"
              className="arcade-stroke text-white text-xl sm:text-2xl leading-tight"
            >
              {t.worldTourTitle}
            </h2>
            <p className="text-xs sm:text-xs font-bold text-amber-100/90 mt-0.5">
              {t.worldTourSubtitle}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="bg-[var(--ink-soft)] border-2 border-[var(--yellow)] rounded-full px-3 py-1 flex items-center gap-1.5">
              <span className="text-sm">⭐</span>
              <span className="arcade-stroke-sm text-[var(--yellow)] text-sm tabular-nums">
                {totalStars}
              </span>
              <span className="text-xs font-bold text-amber-200">
                {t.totalWorldStars}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                pokoAudio.playUiClick();
                onClose();
              }}
              className="arcade-btn-cream px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer"
            >
              <span className="arcade-stroke-sm text-white">✕ {t.closeModal}</span>
            </button>
          </div>
        </div>

        {/* Continent Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              pokoAudio.playUiClick();
              setContinentFilter('all');
            }}
            className={`px-3 py-1.5 rounded-xl border-2 text-xs font-extrabold cursor-pointer transition ${
              continentFilter === 'all'
                ? 'bg-[var(--yellow)] border-[var(--ink-soft)] text-[var(--ink-soft)]'
                : 'bg-[var(--paper)] border-[var(--ink-soft)]/40 text-[var(--ink-soft)] hover:bg-amber-50'
            }`}
          >
            <MapIcon className="mr-1" />{t.allContinents} ({WORLD_CITIES.length})
          </button>
          {CONTINENTS.map((cont) => (
            <button
              key={cont.id}
              type="button"
              onClick={() => {
                pokoAudio.playUiClick();
                setContinentFilter(cont.id);
                const firstInCont = WORLD_CITIES.find((c) => c.continent === cont.id);
                if (firstInCont) {
                  setSelectedCityId(firstInCont.id);
                  setSelectedStage(1);
                }
              }}
              className={`px-3 py-1.5 rounded-xl border-2 text-xs font-extrabold cursor-pointer transition ${
                continentFilter === cont.id
                  ? 'bg-[var(--yellow)] border-[var(--ink-soft)] text-[var(--ink-soft)]'
                  : 'bg-[var(--paper)] border-[var(--ink-soft)]/40 text-[var(--ink-soft)] hover:bg-amber-50'
              }`}
            >
              {cont.icon} {lang === 'zh' ? cont.nameZh : cont.nameEn}
            </button>
          ))}
        </div>

        {/* Main Split Layout: City Grid + Selected City 10-Stage Inspector */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 overflow-y-auto pr-0.5 flex-1 min-h-0">
          {/* City Roster (Left 5 cols) */}
          <div className="md:col-span-5 flex flex-col gap-2 overflow-y-auto max-h-[300px] md:max-h-full pr-1">
            {filteredCities.map((city) => {
              const unlocked = isWorldCityUnlocked(city, progression);
              const earned = getCityEarnedStars(city.id, progression);
              const isSelected = city.id === activeCity.id;
              return (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => {
                    pokoAudio.playUiClick();
                    setSelectedCityId(city.id);
                    setSelectedStage(1);
                  }}
                  className={`text-left rounded-2xl border-2 p-2.5 transition flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--cream)] border-[var(--ink)] shadow-[0_2px_0_#140c04]'
                      : unlocked
                        ? 'bg-[var(--paper)] border-[var(--ink-soft)]/50 hover:bg-amber-50'
                        : 'bg-stone-200/85 border-stone-400 text-stone-600'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 border border-[var(--ink)]"
                        style={{ backgroundColor: city.accentHex }}
                      />
                      <span className="font-display text-sm text-[var(--ink-soft)] truncate">
                        {lang === 'zh' ? city.nameZh : city.nameEn}
                      </span>
                      <span className="text-xs font-bold text-[var(--ink-soft)] truncate">
                        · {lang === 'zh' ? city.countryZh : city.countryEn}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-600 truncate mt-0.5">
                      {lang === 'zh' ? city.taglineZh : city.taglineEn}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {unlocked ? (
                      <div className="text-xs font-extrabold text-amber-700 tabular-nums">
                        ⭐ {earned}/30
                      </div>
                    ) : (
                      <div className="text-xs font-extrabold text-rose-700 bg-rose-100 border border-rose-300 rounded-lg px-2 py-0.5">
                        <LockIcon className="mr-1" />{t.unlockNeedStars.replace('{stars}', String(city.unlockStarsRequired))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected City Detail + Stage 1-10 Grid (Right 7 cols) */}
          <div className="md:col-span-7 bg-[var(--paper)] border-2 border-[var(--ink)] rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--ink)]/15 pb-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-xl text-[var(--ink-soft)]">
                    {lang === 'zh' ? activeCity.nameZh : activeCity.nameEn}
                  </h3>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-amber-100 border border-amber-400 text-[var(--ink-soft)]">
                    {lang === 'zh' ? activeCity.countryZh : activeCity.countryEn}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-600 mt-0.5">
                  {lang === 'zh' ? activeCity.taglineZh : activeCity.taglineEn} · [{activeCity.lat.toFixed(2)}°, {activeCity.lng.toFixed(2)}°]
                </p>
              </div>
              {!cityUnlocked && (
                <div className="px-3 py-1 rounded-xl bg-rose-100 border-2 border-rose-400 text-rose-800 text-xs font-extrabold">
                  <span className="inline-flex items-center"><LockIcon className="mr-1" />{t.unlockNeedStars.replace('{stars}', String(activeCity.unlockStarsRequired))} ({totalStars}/{activeCity.unlockStarsRequired})</span>
                </div>
              )}
            </div>

            {/* Landmarks & Signature Dishes Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-2">
                <div className="font-extrabold text-[var(--ink-soft)] mb-1"><LandmarkIcon className="mr-1" />{t.cityLandmarks}</div>
                <div className="flex flex-col gap-0.5 font-bold text-[var(--ink-soft)]">
                  {activeCity.landmarks.map((lm) => (
                    <span key={lm.loreId} className="truncate">
                      {lm.icon} {lang === 'zh' ? lm.nameZh : lm.nameEn}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-sky-50 border border-sky-300 rounded-xl p-2">
                <div className="font-extrabold text-sky-900 mb-1"><FoodIcon className="mr-1" />{t.signatureDishes}</div>
                <div className="flex flex-wrap gap-1">
                  {activeCity.dishes.slice(0, 4).map((d) => (
                    <span
                      key={d.loreId}
                      className="text-xs font-bold bg-white border border-sky-200 rounded-md px-1.5 py-0.5 truncate max-w-[130px]"
                    >
                      {d.icon} {lang === 'zh' ? d.nameZh : d.nameEn}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 10 District Stages Grid */}
            <div>
              <div className="text-xs font-extrabold text-[var(--ink-soft)] mb-1.5">
                {t.selectDistrictStage.replace(
                  '{city}',
                  lang === 'zh' ? activeCity.nameZh : activeCity.nameEn,
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {activeCity.stages.map((st) => {
                  const stars = progression.worldCityStars[`${activeCity.id}:${st.stage}`] ?? 0;
                  const playable = isStagePlayable(st.stage);
                  const isPicked = selectedStage === st.stage;
                  return (
                    <button
                      key={st.stage}
                      type="button"
                      disabled={!playable}
                      onClick={() => {
                        pokoAudio.playUiClick();
                        setSelectedStage(st.stage);
                      }}
                      className={`rounded-xl border-2 p-2 text-left transition flex flex-col justify-between gap-1 ${
                        !playable
                          ? 'bg-stone-200 border-stone-300 text-stone-400 cursor-not-allowed'
                          : isPicked
                            ? 'bg-[var(--yellow)] border-[var(--ink)] text-[var(--ink-soft)] shadow-[0_2px_0_#140c04] cursor-pointer'
                            : 'bg-white border-[var(--ink-soft)]/40 hover:bg-amber-50 text-[var(--ink-soft)] cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-extrabold">
                        <span>S{st.stage}</span>
                        <span>{playable ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : <LockIcon />}</span>
                      </div>
                      <div className="text-xs font-bold truncate leading-tight">
                        {lang === 'zh' ? st.districtZh : st.districtEn}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Stage Detail & Play CTA */}
            <div className="mt-auto bg-[var(--cream)] border-2 border-[var(--ink-soft)] rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-[var(--ink-soft)]">
                <div className="font-extrabold text-sm">
                  Stage {activeStageDef.stage} ·{' '}
                  {lang === 'zh' ? activeStageDef.districtZh : activeStageDef.districtEn}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  <BoxIcon className="mr-1" />{activeStageDef.stopCount} {lang === 'zh' ? '个站点' : 'Stops'} · <ClockIcon className="mx-1" />{' '}
                  {activeStageDef.timeLimitSec}s · <RulerIcon className="ml-1 mr-1" />{activeStageDef.gridSize}×{activeStageDef.gridSize}
                </div>
              </div>
              <button
                type="button"
                disabled={!isStagePlayable(activeStageDef.stage)}
                onClick={handleLaunchStage}
                className={`px-5 py-2.5 rounded-xl font-display text-sm sm:text-base transition ${
                  isStagePlayable(activeStageDef.stage)
                    ? 'arcade-btn-green cursor-pointer hover:-translate-y-0.5'
                    : 'bg-stone-300 border-2 border-stone-400 text-stone-500 cursor-not-allowed'
                }`}
              >
                <span className={isStagePlayable(activeStageDef.stage) ? 'arcade-stroke-sm text-white' : ''}>
                  {isStagePlayable(activeStageDef.stage)
                    ? t.playWorldStage
                    : t.locked}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
import { BoxIcon, ClockIcon, FoodIcon, LandmarkIcon, LockIcon, MapIcon, RulerIcon } from './hud/icons';
