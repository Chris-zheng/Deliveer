/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { pokoAudio } from '../game/audio';
import { I18N, SupportedLanguage } from '../game/i18n';
import { DiscoveryLorePayload, ParcelKind } from '../game/types';

export interface ActiveDiscoveryModalState extends DiscoveryLorePayload {
  isFirstDiscovery: boolean;
}

interface DiscoveryModalProps {
  item: ActiveDiscoveryModalState | null;
  lang: SupportedLanguage;
  alwaysShowEveryStop: boolean;
  onToggleAlwaysShow: (nextValue: boolean) => void;
  onConfirmDeliver: () => void;
}

export const DiscoveryModal: React.FC<DiscoveryModalProps> = ({
  item,
  lang,
  alwaysShowEveryStop,
  onToggleAlwaysShow,
  onConfirmDeliver,
}) => {
  useEffect(() => {
    if (!item) return;
    if (item.kind === 'landmark') {
      pokoAudio.playDiscoveryChime('landmark', item.isFirstDiscovery);
    } else if (item.isFirstDiscovery) {
      pokoAudio.playDiscoveryChime('parcel', true);
    }
  }, [item?.loreId, item?.kind, item?.isFirstDiscovery]);

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        pokoAudio.playUiClick();
        onConfirmDeliver();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [item, onConfirmDeliver]);

  if (!item) return null;

  const t = I18N[lang];
  const isLandmark = item.kind === 'landmark';
  const title = lang === 'zh' ? item.titleZh : item.titleEn;
  const subtitle = lang === 'zh' ? item.subtitleZh : item.subtitleEn;
  const cityName = lang === 'zh' ? item.cityNameZh : item.cityNameEn;
  const district = lang === 'zh' ? item.districtZh : item.districtEn;
  const fact = lang === 'zh' ? item.factZh : item.factEn;
  const tip = lang === 'zh' ? item.tipZh : item.tipEn;
  const street = lang === 'zh' ? item.streetName : (item.streetNameEn || item.streetName);

  const parcelTag =
    item.parcelKind === ParcelKind.HotExpress
      ? lang === 'zh'
        ? <><FlameIcon className="mr-1" />热食极速</>
        : <><FlameIcon className="mr-1" />HOT EXPRESS</>
      : item.parcelKind === ParcelKind.Fragile
        ? lang === 'zh'
          ? <><BoxIcon className="mr-1" />易碎轻放</>
          : <><BoxIcon className="mr-1" />FRAGILE</>
        : item.parcelKind === ParcelKind.Large
          ? lang === 'zh'
            ? <><BoxIcon className="mr-1" />大件稳停</>
            : <><BoxIcon className="mr-1" />HEAVY CRATE</>
          : lang === 'zh'
            ? <><BoltIcon className="mr-1" />轻巧飞掷</>
            : <><BoltIcon className="mr-1" />EXPRESS TOSS</>;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="discovery-modal-title"
    >
      <div className="pointer-events-auto arcade-panel rounded-[28px] p-4 sm:p-6 w-full max-w-lg max-h-[92vh] overflow-y-auto flex flex-col gap-3.5 shadow-2xl">
        {/* Top Banner */}
        <div className="arcade-pill-brown rounded-2xl px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-extrabold text-[#ffee1f] truncate">
              <MapPinIcon className="mr-1" />{cityName} · {district}
            </span>
            <span className="text-[11px] font-bold text-amber-100/90 truncate">
              {isLandmark ? t.discoveryCategoryLandmark : t.discoveryCategoryDish}
            </span>
          </div>
          <span
            className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-extrabold border-2 border-[#140c04] ${
              item.isFirstDiscovery
                ? 'bg-[#ffe524] text-[#4b1c08]'
                : 'bg-[#38bdf8] text-[#082f49]'
            }`}
          >
            {item.isFirstDiscovery ? (<><SparkIcon className="mr-1" />{t.discoveryNewBadge}</>) : t.discoveryAlreadyKnown}
          </span>
        </div>

        {/* Hero Item Header */}
        <div className="bg-[#fffdf5] border-[3px] border-[#140c04] rounded-2xl p-4 flex items-center gap-3.5 shadow-inner">
          <div
            className={`w-16 h-16 sm:w-18 sm:h-18 rounded-2xl border-[3px] border-[#140c04] flex items-center justify-center text-4xl shrink-0 shadow-sm ${
              isLandmark ? 'bg-amber-200' : 'bg-sky-100'
            }`}
          >
            {item.icon}
          </div>
          <div className="flex flex-col min-w-0 flex-1 gap-1">
            <h2
              id="discovery-modal-title"
              className="font-display text-lg sm:text-xl text-[#2b1b08] leading-snug"
            >
              {title}
            </h2>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-extrabold text-[#9a3412] bg-amber-100 border border-amber-400 rounded-lg px-2 py-0.5">
                {subtitle}
              </span>
              {!isLandmark && (
                <span className="text-[11px] font-extrabold text-[#1e3a8a] bg-sky-100 border border-sky-300 rounded-lg px-2 py-0.5">
                  {parcelTag}
                </span>
              )}
            </div>
            {(item.merchantName || street) && (
              <div className="text-[11px] font-bold text-slate-600 truncate">
                {item.merchantName ? `${t.discoveryMerchantLabel}: ${item.merchantName}` : ''}
                {item.merchantName && street ? ' · ' : ''}
                {street ? (<><FlagIcon className="mr-1" />{street}</>) : ''}
              </div>
            )}
          </div>
        </div>

        {/* Cultural Lore Fact Box */}
        <div className="bg-[#fff8e7] border-[2.5px] border-[#784812] rounded-2xl p-3.5 flex flex-col gap-1.5">
          <div className="text-xs font-extrabold text-[#9a3412] flex items-center gap-1.5">
            <span><BookIcon /></span>
            <span>{lang === 'zh' ? '城市风物文化档案' : 'Cultural & City Lore'}</span>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-[#2b1b08] leading-relaxed">
            {fact}
          </p>
        </div>

        {/* Rider Delivery Tip */}
        {tip && (
          <div className="bg-emerald-50 border-[2.5px] border-emerald-700 rounded-2xl p-3 flex items-start gap-2">
            <span className="text-base leading-none mt-0.5"><TruckIcon /></span>
            <div className="text-xs font-bold text-emerald-950 leading-snug">
              <span className="font-extrabold">{t.discoveryTipLabel}: </span>
              {tip}
            </div>
          </div>
        )}

        {/* Auto-open preference */}
        <label className="flex items-center gap-2 px-1 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!alwaysShowEveryStop}
            onChange={(e) => onToggleAlwaysShow(!e.target.checked)}
            className="w-4 h-4 accent-[#2ea836] rounded cursor-pointer"
          />
          <span className="text-[11px] font-bold text-[#4b1c08]">
            {t.discoveryAutoShowToggle}
          </span>
        </label>

        {/* Confirm CTA */}
        <button
          type="button"
          data-start="true"
          onClick={() => {
            pokoAudio.playUiClick();
            onConfirmDeliver();
          }}
          className={`${
            isLandmark ? 'arcade-btn-gold' : 'arcade-btn-green'
          } w-full py-3.5 px-5 rounded-2xl cursor-pointer transition-transform hover:-translate-y-0.5 active:translate-y-0.5`}
        >
          <span className="arcade-stroke text-white text-lg sm:text-xl">
            {isLandmark ? t.discoveryLandmarkBtn : t.discoveryDeliverBtn}
          </span>
        </button>

        <div className="text-center text-[11px] font-bold text-[#5c3809]">
          ⏸ {t.discoveryPauseNote} · [{lang === 'zh' ? '按 空格 / Enter 继续' : 'Press Space / Enter'}]
        </div>
      </div>
    </div>
  );
};
import { BoltIcon, BookIcon, BoxIcon, FlagIcon, FlameIcon, MapPinIcon, SparkIcon, TruckIcon } from './hud/icons';
