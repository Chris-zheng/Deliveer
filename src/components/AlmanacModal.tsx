/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { pokoAudio } from '../game/audio';
import { I18N, SupportedLanguage } from '../game/i18n';
import { WORLD_CITIES } from '../game/worldCities';
import { PlayerProgression } from '../game/types';

interface AlmanacModalProps {
  open: boolean;
  lang: SupportedLanguage;
  progression: PlayerProgression;
  onClose: () => void;
}

export const AlmanacModal: React.FC<AlmanacModalProps> = ({
  open,
  lang,
  progression,
  onClose,
}) => {
  const [selectedCityId, setSelectedCityId] = useState<string>(WORLD_CITIES[0].id);
  const [selectedLoreId, setSelectedLoreId] = useState<string | null>(null);

  const discoveredSet = useMemo(
    () => new Set(progression.discoveredLoreIds),
    [progression.discoveredLoreIds],
  );

  const totalEntries = useMemo(
    () =>
      WORLD_CITIES.reduce(
        (sum, city) => sum + city.dishes.length + city.landmarks.length,
        0,
      ),
    [],
  );

  const discoveredWorldCount = useMemo(
    () =>
      WORLD_CITIES.reduce(
        (sum, city) =>
          sum +
          city.dishes.filter((d) => discoveredSet.has(d.loreId)).length +
          city.landmarks.filter((lm) => discoveredSet.has(lm.loreId)).length,
        0,
      ),
    [discoveredSet],
  );

  if (!open) return null;

  const t = I18N[lang];
  const activeCity =
    WORLD_CITIES.find((c) => c.id === selectedCityId) ?? WORLD_CITIES[0];

  const activeEntry =
    activeCity.dishes.find((d) => d.loreId === selectedLoreId) ??
    activeCity.landmarks.find((lm) => lm.loreId === selectedLoreId) ??
    null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-2.5 sm:p-5 bg-black/65 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="almanac-heading"
    >
      <div className="pointer-events-auto arcade-panel rounded-[28px] p-4 sm:p-6 w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col gap-3.5">
        {/* Header */}
        <div className="arcade-pill-brown rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div>
            <h2
              id="almanac-heading"
              className="arcade-stroke text-white text-xl sm:text-2xl leading-tight"
            >
              <BookIcon className="mr-1" />{t.almanacTitle}
            </h2>
            <p className="text-[11px] sm:text-xs font-bold text-amber-100/90 mt-0.5">
              {t.almanacSubtitle}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="bg-[#2b1b08] border-2 border-[#6bf25c] rounded-full px-3 py-1 text-xs font-extrabold text-[#6bf25c] tabular-nums">
              {t.almanacCollected
                .replace('{count}', String(discoveredWorldCount))
                .replace('{total}', String(totalEntries))}
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

        {/* City Pills Strip */}
        <div className="flex flex-wrap gap-1.5 max-h-[84px] overflow-y-auto shrink-0 pb-1">
          {WORLD_CITIES.map((city) => {
            const count =
              city.dishes.filter((d) => discoveredSet.has(d.loreId)).length +
              city.landmarks.filter((lm) => discoveredSet.has(lm.loreId)).length;
            const total = city.dishes.length + city.landmarks.length;
            const isSel = city.id === activeCity.id;
            return (
              <button
                key={city.id}
                type="button"
                onClick={() => {
                  pokoAudio.playUiClick();
                  setSelectedCityId(city.id);
                  setSelectedLoreId(null);
                }}
                className={`px-2.5 py-1 rounded-xl border-2 text-xs font-extrabold cursor-pointer transition ${
                  isSel
                    ? 'bg-[#ffe524] border-[#140c04] text-[#2b1b08]'
                    : 'bg-[#fffdf5] border-[#784812]/40 text-[#5c3809] hover:bg-amber-50'
                }`}
              >
                {lang === 'zh' ? city.nameZh : city.nameEn} ({count}/{total})
              </button>
            );
          })}
        </div>

        {/* Entries Grid + Lore Reader */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 overflow-y-auto flex-1 min-h-0">
          <div className="md:col-span-7 flex flex-col gap-3 overflow-y-auto pr-1">
            <div>
              <div className="text-xs font-extrabold text-[#4b1c08] mb-1.5">
                <LandmarkIcon className="mr-1" />{t.cityLandmarks}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeCity.landmarks.map((lm) => {
                  const unlocked = discoveredSet.has(lm.loreId);
                  return (
                    <button
                      key={lm.loreId}
                      type="button"
                      onClick={() => {
                        pokoAudio.playUiClick();
                        setSelectedLoreId(lm.loreId);
                      }}
                      className={`text-left rounded-2xl border-2 p-2.5 flex items-center gap-2.5 cursor-pointer transition ${
                        selectedLoreId === lm.loreId
                          ? 'bg-[#fff3c4] border-[#140c04]'
                          : unlocked
                            ? 'bg-[#fffdf5] border-[#784812]/50 hover:bg-amber-50'
                            : 'bg-stone-200/80 border-stone-400 text-stone-500'
                      }`}
                    >
                      <span className={`text-2xl ${unlocked ? '' : 'grayscale opacity-50'}`}>
                        {lm.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="font-display text-xs sm:text-sm truncate">
                          {unlocked ? (lang === 'zh' ? lm.nameZh : lm.nameEn) : '???'}
                        </div>
                        <div className="text-[10px] font-bold truncate">
                          {unlocked ? (lang === 'zh' ? lm.eraZh : lm.eraEn) : t.locked}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-xs font-extrabold text-[#4b1c08] mb-1.5">
                <FoodIcon className="mr-1" />{t.signatureDishes}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeCity.dishes.map((dish) => {
                  const unlocked = discoveredSet.has(dish.loreId);
                  return (
                    <button
                      key={dish.loreId}
                      type="button"
                      onClick={() => {
                        pokoAudio.playUiClick();
                        setSelectedLoreId(dish.loreId);
                      }}
                      className={`text-left rounded-2xl border-2 p-2.5 flex items-center gap-2.5 cursor-pointer transition ${
                        selectedLoreId === dish.loreId
                          ? 'bg-[#fff3c4] border-[#140c04]'
                          : unlocked
                            ? 'bg-[#fffdf5] border-[#784812]/50 hover:bg-amber-50'
                            : 'bg-stone-200/80 border-stone-400 text-stone-500'
                      }`}
                    >
                      <span className={`text-2xl ${unlocked ? '' : 'grayscale opacity-50'}`}>
                        {dish.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="font-display text-xs sm:text-sm truncate">
                          {unlocked ? (lang === 'zh' ? dish.nameZh : dish.nameEn) : '???'}
                        </div>
                        <div className="text-[10px] font-bold truncate">
                          {unlocked ? (lang === 'zh' ? dish.categoryZh : dish.categoryEn) : t.locked}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Selected Entry Reader */}
          <div className="md:col-span-5 bg-[#fffdf5] border-[3px] border-[#140c04] rounded-2xl p-4 flex flex-col justify-center gap-2.5">
            {activeEntry ? (
              discoveredSet.has(activeEntry.loreId) ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{activeEntry.icon}</span>
                    <div>
                      <div className="font-display text-lg text-[#2b1b08]">
                        {lang === 'zh' ? activeEntry.nameZh : activeEntry.nameEn}
                      </div>
                      <div className="text-xs font-extrabold text-[#9a3412]">
                        {'categoryZh' in activeEntry
                          ? lang === 'zh'
                            ? activeEntry.categoryZh
                            : activeEntry.categoryEn
                          : lang === 'zh'
                            ? activeEntry.eraZh
                            : activeEntry.eraEn}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-[#2b1b08] leading-relaxed bg-[#fff8e7] border border-amber-300 rounded-xl p-3">
                    {lang === 'zh' ? activeEntry.factZh : activeEntry.factEn}
                  </p>
                  {'tipZh' in activeEntry && (
                    <div className="text-xs font-bold text-emerald-900 bg-emerald-50 border border-emerald-300 rounded-xl p-2.5">
                      <TruckIcon className="mr-1" />{lang === 'zh' ? activeEntry.tipZh : activeEntry.tipEn}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6 flex flex-col items-center gap-2">
                  <LockIcon className="w-9 h-9 text-[#8a6a44] opacity-60" />
                  <div className="font-display text-base text-[#5c3809]">
                    {t.locked}
                  </div>
                  <p className="text-xs font-bold text-slate-500">
                    {t.almanacLockedHint}
                  </p>
                </div>
              )
            ) : (
              <div className="text-center py-6 text-xs font-bold text-slate-500">
                {lang === 'zh'
                  ? `点击左侧卡片查看「${activeCity.nameZh}」的风物文化档案`
                  : `Select an item on the left to read lore from ${activeCity.nameEn}`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
import { BookIcon, FoodIcon, LandmarkIcon, LockIcon, TruckIcon } from './hud/icons';
