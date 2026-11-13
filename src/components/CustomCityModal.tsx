/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { pokoAudio } from '../game/audio';
import {
  PRESET_CITIES,
  CityPreset,
  GeocodedLocation,
  fetchRealStreetsOverpass,
  getRealStreetsForCity,
  reverseGeocodeGps,
  searchCities,
  synthesizeCustomCityConfig,
} from '../game/customCity';
import { I18N, SupportedLanguage } from '../game/i18n';
import {
  CityArchetype,
  LevelConfig,
  ShiftAtmosphere,
  TILE_SIZE,
  TileType,
} from '../game/types';
import { generateProceduralCity } from '../game/proceduralCity';

interface CustomCityModalProps {
  open: boolean;
  lang: SupportedLanguage;
  onClose: () => void;
  onSelectCustomCity: (config: LevelConfig) => void;
}

export const CustomCityModal: React.FC<CustomCityModalProps> = ({
  open,
  lang,
  onClose,
  onSelectCustomCity,
}) => {
  const t = I18N[lang];

  // Selected city state
  const [selectedPreset, setSelectedPreset] = useState<CityPreset>(PRESET_CITIES[0]);
  const [cityName, setCityName] = useState<string>(PRESET_CITIES[0].nameZh);
  const [districtName, setDistrictName] = useState<string>(PRESET_CITIES[0].districtZh);
  const [lat, setLat] = useState<number>(PRESET_CITIES[0].lat);
  const [lng, setLng] = useState<number>(PRESET_CITIES[0].lng);
  const [archetype, setArchetype] = useState<CityArchetype>(PRESET_CITIES[0].archetype);
  const [atmosphere, setAtmosphere] = useState<ShiftAtmosphere>(PRESET_CITIES[0].defaultAtmosphere);
  const [gridSize, setGridSize] = useState<15 | 17 | 19>(17);
  const [stopCount, setStopCount] = useState<number>(6);
  const [trafficDensity, setTrafficDensity] = useState<'low' | 'med' | 'high'>('med');

  // Search & Geolocation state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<GeocodedLocation[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [realStreets, setRealStreets] = useState<string[]>(() =>
    getRealStreetsForCity(PRESET_CITIES[0].nameZh),
  );
  const [loadingStreets, setLoadingStreets] = useState<boolean>(false);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fetch real OSM street names for current city/coordinates
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingStreets(true);
    setRealStreets(getRealStreetsForCity(cityName));
    fetchRealStreetsOverpass(lat, lng, cityName)
      .then((streets) => {
        if (!cancelled && streets.length > 0) {
          setRealStreets(streets);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingStreets(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, cityName, lat, lng]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchCities(searchQuery);
        setSearchResults(res);
      } finally {
        setIsSearching(false);
      }
    }, 380);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle Preset Select
  const handleSelectPreset = (p: CityPreset) => {
    pokoAudio.playUiClick();
    setSelectedPreset(p);
    setCityName(lang === 'zh' ? p.nameZh : p.nameEn);
    setDistrictName(lang === 'zh' ? p.districtZh : p.districtEn);
    setLat(p.lat);
    setLng(p.lng);
    setArchetype(p.archetype);
    setAtmosphere(p.defaultAtmosphere);
    setLocationNotice(null);
  };

  // Handle GPS location
  const handleGetGpsLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationNotice(t.locationError);
      return;
    }
    pokoAudio.playUiClick();
    setIsLocatingGps(true);
    setLocationNotice(t.locating);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setLat(userLat);
        setLng(userLng);
        try {
          const geo = await reverseGeocodeGps(userLat, userLng);
          setCityName(geo.cityName);
          setDistrictName(`${geo.cityName} · 专属生活区`);
          setLocationNotice(`${t.locationSuccess} ${geo.displayName}`);
        } catch {
          setCityName('我的当前位置');
          setDistrictName('本地生活街区');
          setLocationNotice(`${t.locationSuccess} [${userLat.toFixed(3)}°N, ${userLng.toFixed(3)}°E]`);
        } finally {
          setIsLocatingGps(false);
        }
      },
      () => {
        setIsLocatingGps(false);
        setLocationNotice(t.locationError);
      },
      { timeout: 8000, enableHighAccuracy: false },
    );
  };

  // Handle search item selection
  const handleSelectSearchResult = (loc: GeocodedLocation) => {
    pokoAudio.playUiClick();
    setCityName(loc.name);
    setDistrictName(`${loc.name} · ${lang === 'zh' ? '繁华商圈' : 'Central District'}`);
    setLat(loc.lat);
    setLng(loc.lng);
    setSearchQuery('');
    setSearchResults([]);
    setLocationNotice(`${t.locationSuccess} ${loc.displayName}`);
  };

  // Generate preview config & draw live 2D mini preview
  useEffect(() => {
    if (!open) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tempCfg = synthesizeCustomCityConfig({
      cityName,
      districtName,
      lat,
      lng,
      archetype,
      atmosphere,
      gridSize,
      stopCount,
      trafficDensity,
      streets: realStreets,
    });

    const previewCity = generateProceduralCity(tempCfg.level, undefined, tempCfg);
    const N = previewCity.totalGridSize;
    const w = canvas.width;
    const h = canvas.height;
    const cellSize = w / N;

    // Background water
    ctx.fillStyle = atmosphere === ShiftAtmosphere.TwilightNeon ? '#162846' : atmosphere === ShiftAtmosphere.GoldenSunset ? '#2e759f' : '#4bb7ef';
    ctx.fillRect(0, 0, w, h);

    // Tiles
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const tile = previewCity.tiles[r][c];
        if (tile === TileType.Water) continue;

        if (tile === TileType.InnerRoad || tile === TileType.OuterRoad) {
          ctx.fillStyle = '#f8f5ed';
        } else if (tile === TileType.Bridge) {
          ctx.fillStyle = '#e8a964';
        } else if (tile === TileType.Building) {
          ctx.fillStyle = '#78b858';
        } else if (tile === TileType.Plaza || tile === TileType.Courtyard) {
          ctx.fillStyle = '#f3e3ba';
        } else {
          ctx.fillStyle = '#9bd85f';
        }
        ctx.fillRect(c * cellSize, r * cellSize, cellSize + 0.3, cellSize + 0.3);
      }
    }

    // Draw real street names onto miniature road grid
    const halfSpan = (N * TILE_SIZE) * 0.5;
    for (let si = 0; si < Math.min(6, previewCity.streetSigns.length); si++) {
      const sign = previewCity.streetSigns[si];
      const sx = ((sign.x + halfSpan) / (N * TILE_SIZE)) * w;
      const sy = ((sign.z + halfSpan) / (N * TILE_SIZE)) * h;
      const clampedX = Math.max(28, Math.min(w - 28, sx));
      const clampedY = Math.max(12, Math.min(h - 12, sy));
      ctx.font = 'bold 8px sans-serif';
      const tw = ctx.measureText(sign.streetName).width;
      ctx.fillStyle = 'rgba(22, 93, 255, 0.88)';
      ctx.fillRect(clampedX - tw * 0.5 - 3, clampedY - 5.5, tw + 6, 11);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.7;
      ctx.strokeRect(clampedX - tw * 0.5 - 3, clampedY - 5.5, tw + 6, 11);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sign.streetName, clampedX, clampedY + 0.5);
    }

    // Draw Delivery Stop Pins (Golden Stars)
    for (const stop of previewCity.stops) {
      const sx = (stop.citizenCoord.col + 0.5) * cellSize;
      const sy = (stop.citizenCoord.row + 0.5) * cellSize;
      ctx.fillStyle = '#ff3b3b';
      ctx.beginPath();
      ctx.arc(sx, sy, cellSize * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(stop.index), sx, sy);
    }

    // Draw Start Van Spawn
    const spawnX = (previewCity.spawnCoord.col + 0.5) * cellSize;
    const spawnY = (previewCity.spawnCoord.row + 0.5) * cellSize;
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(spawnX, spawnY, cellSize * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [open, cityName, districtName, lat, lng, archetype, atmosphere, gridSize, stopCount, trafficDensity, realStreets]);

  if (!open) return null;

  const handleLaunch = () => {
    pokoAudio.playUiClick();
    const finalConfig = synthesizeCustomCityConfig({
      cityName,
      districtName,
      lat,
      lng,
      archetype,
      atmosphere,
      gridSize,
      stopCount,
      trafficDensity,
      streets: realStreets,
    });
    onSelectCustomCity(finalConfig);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="pointer-events-auto arcade-panel relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-[32px] border-[4px] border-[#5a270f] bg-gradient-to-b from-[#fde8c2] via-[#f7d399] to-[#efbe77] shadow-[0_16px_40px_rgba(20,10,4,0.6),inset_0_-8px_0_#c47c34] p-4 sm:p-6 flex flex-col gap-4 text-[#3d1a08]">
        {/* Close Button Top Right */}
        <button
          type="button"
          onClick={() => {
            pokoAudio.playUiClick();
            onClose();
          }}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#e65124] border-[2.5px] border-[#6b1e07] shadow-[inset_0_2px_0_rgba(255,255,255,0.4),0_2px_0_rgba(40,12,3,0.4)] flex items-center justify-center text-white font-bold cursor-pointer transition-transform hover:scale-105 active:scale-95 z-20"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Modal Title Banner */}
        <div className="text-center pt-1 pr-8">
          <div className="inline-block arcade-pill-brown rounded-full px-4 py-1 text-xs font-bold text-[#ffe629] mb-1">
            {t.customDistrictBadge}
          </div>
          <h2 className="arcade-stroke text-white text-2xl sm:text-3xl leading-tight">
            {t.customCityTitle}
          </h2>
          <p className="text-xs sm:text-[13px] font-bold text-[#63290e] max-w-md mx-auto mt-1 leading-snug">
            {t.customCitySubtitle}
          </p>
        </div>

        {/* Section 1: Search and GPS input */}
        <div className="bg-[#fff8ea] rounded-2xl border-[2.5px] border-[#8a4216] p-3 sm:p-3.5 flex flex-col gap-2.5 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchCityPlaceholder}
                className="w-full bg-white rounded-xl border-2 border-[#b56e3b] px-3.5 py-2 text-xs sm:text-sm font-bold text-[#441b08] placeholder:text-[#9e6740] focus:outline-none focus:border-[#e65124]"
              />
              {isSearching && (
                <span className="absolute right-3 top-2.5 text-xs text-[#b56e3b] font-bold animate-pulse">
                  {t.loadingSearch}
                </span>
              )}

              {/* Suggestions Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-[#8a4216] rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto">
                  {searchResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSearchResult(item)}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-[#441b08] hover:bg-[#ffeac7] border-b border-amber-100 last:border-b-0 cursor-pointer"
                    >
                      📍 {item.displayName}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={isLocatingGps}
              onClick={handleGetGpsLocation}
              className="arcade-btn-cream shrink-0 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              {isLocatingGps ? t.locating : t.useCurrentLocation}
            </button>
          </div>

          {locationNotice && (
            <div className="text-[11.5px] font-bold text-[#8a330e] bg-[#ffe4c2] rounded-lg px-2.5 py-1">
              {locationNotice}
            </div>
          )}

          {/* Preset Cities Tags */}
          <div className="flex flex-col gap-1 mt-1">
            <span className="text-[11px] font-extrabold text-[#783612]">
              {t.presetCities}
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {PRESET_CITIES.map((p) => {
                const isSelected = cityName === p.nameZh || cityName === p.nameEn;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#e85d25] text-white shadow-[0_2px_0_#802206] -translate-y-0.5'
                        : 'bg-[#f7dfb8] text-[#5c240a] hover:bg-[#ffd296] border border-[#cf8b4e]'
                    }`}
                  >
                    {lang === 'zh' ? p.nameZh : p.nameEn}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 2: Selected City Preview & Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
          {/* Left: Map Canvas & Location info */}
          <div className="bg-[#fff8ea] rounded-2xl border-[2.5px] border-[#8a4216] p-3 flex flex-col items-center gap-2">
            <div className="w-full flex items-center justify-between text-xs font-extrabold text-[#5c240a]">
              <span>📍 {cityName}</span>
              <span className="text-[10.5px] text-[#8a481c]">
                {lat.toFixed(2)}°N, {lng.toFixed(2)}°E
              </span>
            </div>

            {/* Live 2D Canvas Mini Preview */}
            <div className="relative w-44 h-44 sm:w-48 sm:h-48 rounded-xl border-2 border-[#682e10] overflow-hidden bg-sky-200 shadow-inner shrink-0">
              <canvas
                ref={previewCanvasRef}
                width={200}
                height={200}
                className="w-full h-full block"
              />
              <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                {t.mapPreviewTitle}
              </span>
            </div>

            <div className="text-center text-[11px] font-bold text-[#6d2f10] line-clamp-1">
              {districtName}
            </div>

            {/* Real Street Chips */}
            <div className="w-full flex flex-wrap items-center justify-center gap-1 pt-0.5">
              {loadingStreets ? (
                <span className="text-[10px] font-bold text-[#8a481c]">
                  {lang === 'zh' ? '正在同步真实街道路网...' : 'Syncing real OSM street names...'}
                </span>
              ) : (
                realStreets.slice(0, 5).map((st, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 py-0.5 rounded bg-[#165dff] text-white text-[9.5px] font-bold border border-white shadow-xs"
                  >
                    {st}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Right: Customization Controls */}
          <div className="bg-[#fff8ea] rounded-2xl border-[2.5px] border-[#8a4216] p-3 flex flex-col justify-between gap-2.5 text-xs font-bold text-[#5c240a]">
            {/* Grid Size */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#7d3914]">{t.mapSizeLabel}</label>
              <div className="grid grid-cols-3 gap-1">
                {([15, 17, 19] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => {
                      pokoAudio.playUiClick();
                      setGridSize(sz);
                    }}
                    className={`py-1 rounded-lg text-center cursor-pointer text-[11px] font-extrabold ${
                      gridSize === sz
                        ? 'bg-[#2ea836] text-white shadow-[0_2px_0_#145a1a]'
                        : 'bg-[#f4deb5] text-[#5a250a] border border-[#cf925c]'
                    }`}
                  >
                    {sz === 15 ? '15x15' : sz === 17 ? '17x17' : '19x19'}
                  </button>
                ))}
              </div>
            </div>

            {/* Atmosphere (Time of Day) */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#7d3914]">{t.atmosphereLabel}</label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: ShiftAtmosphere.SunnyHarbor, label: t.atmoSunny, icon: '☀️' },
                  { id: ShiftAtmosphere.GoldenSunset, label: t.atmoSunset, icon: '🌅' },
                  { id: ShiftAtmosphere.TwilightNeon, label: t.atmoNeon, icon: '🌃' },
                ].map((atm) => (
                  <button
                    key={atm.id}
                    type="button"
                    onClick={() => {
                      pokoAudio.playUiClick();
                      setAtmosphere(atm.id);
                    }}
                    className={`py-1 rounded-lg text-center cursor-pointer text-[10.5px] font-extrabold ${
                      atmosphere === atm.id
                        ? 'bg-[#2ea836] text-white shadow-[0_2px_0_#145a1a]'
                        : 'bg-[#f4deb5] text-[#5a250a] border border-[#cf925c]'
                    }`}
                  >
                    {atm.icon} {atm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery Stops Count */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[11px] text-[#7d3914]">
                <span>{t.stopsCountLabel}</span>
                <span className="font-extrabold text-[#e85d25]">
                  {t.stopsCountValue.replace('{count}', String(stopCount))}
                </span>
              </div>
              <input
                type="range"
                min={3}
                max={9}
                step={1}
                value={stopCount}
                onChange={(e) => setStopCount(Number(e.target.value))}
                className="accent-[#e85d25] cursor-pointer"
              />
            </div>

            {/* Traffic Density */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#7d3914]">{t.trafficDensityLabel}</label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'low', label: t.trafficLow },
                  { id: 'med', label: t.trafficMed },
                  { id: 'high', label: t.trafficHigh },
                ].map((dens) => (
                  <button
                    key={dens.id}
                    type="button"
                    onClick={() => {
                      pokoAudio.playUiClick();
                      setTrafficDensity(dens.id as any);
                    }}
                    className={`py-1 rounded-lg text-center cursor-pointer text-[11px] font-extrabold ${
                      trafficDensity === dens.id
                        ? 'bg-[#2ea836] text-white shadow-[0_2px_0_#145a1a]'
                        : 'bg-[#f4deb5] text-[#5a250a] border border-[#cf925c]'
                    }`}
                  >
                    {dens.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Launch Button */}
        <button
          type="button"
          onClick={handleLaunch}
          className="arcade-btn-gold w-full py-3 sm:py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-transform hover:-translate-y-0.5 active:translate-y-1 shadow-lg"
        >
          <span className="text-xl sm:text-2xl">🚗</span>
          <span className="arcade-stroke text-white text-lg sm:text-2xl tracking-wide">
            {t.playCustomCity}
          </span>
        </button>
      </div>
    </div>
  );
};
