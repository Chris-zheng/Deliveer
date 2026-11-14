/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GameHud, MinimapSnapshot } from './components/GameHud';
import { GarageShopModal } from './components/GarageShopModal';
import { QuestsRulesModal } from './components/QuestsRulesModal';
import { StatusModal } from './components/StatusModal';
import { TitleOverlay } from './components/TitleOverlay';
import { pokoAudio } from './game/audio';
import { getLevelConfig } from './game/proceduralCity';
import {
  SpinWheelSlice,
  VEHICLE_SPECS,
  claimQuest,
  executeLuckySpin,
  incrementQuestProgress,
  loadProgression,
  purchaseOrSelectLivery,
  purchaseOrSelectTopper,
  purchaseOrSelectVehicle,
  saveProgression,
} from './game/progression';
import { applyUpgradeLevels, purchaseUpgrade } from './game/upgrades';
import {
  advanceChallengeStreak,
  canCheckInToday,
  claimDailyCheckIn,
  getDailyChallenge,
  getDisplayCheckInStreak,
  loadDailyProgress,
  loadDailyStreak,
  recordDailyRun,
  saveDailyProgress,
  saveDailyStreak,
} from './game/dailyChallenge';
import type { DailyChallenge, DailyProgress, DailyStreakState } from './game/dailyChallenge';
import {
  claimCareerMilestone,
  computeShiftCareerXp,
  exchangeEarningsToCoins,
  getRiderRankInfo,
  hasClaimableMilestone,
  normalizeCareerState,
  recordCareerShift,
} from './game/career';
import { getRunMode, setRunMode } from './game/runMode';
import { CustomCityModal } from './components/CustomCityModal';
import type { CareerLedgerTab } from './components/CareerLedgerModal';
import type { ActiveDiscoveryModalState } from './components/DiscoveryModal';

const WorldMapModal = lazy(() => import('./components/WorldMapModal').then((m) => ({ default: m.WorldMapModal })));
const AlmanacModal = lazy(() => import('./components/AlmanacModal').then((m) => ({ default: m.AlmanacModal })));
const CareerLedgerModal = lazy(() =>
  import('./components/CareerLedgerModal').then((m) => ({ default: m.CareerLedgerModal })),
);
const DiscoveryModal = lazy(() =>
  import('./components/DiscoveryModal').then((m) => ({ default: m.DiscoveryModal })),
);
// Low-frequency panels load on first open so the title screen stays light.
import { buildWorldCityLevelConfig, getWorldCityById } from './game/worldCities';
import { recordLoreDiscovery, recordWorldStageStars } from './game/progression';
import { SupportedLanguage, getInitialLanguage, saveLanguagePreference } from './game/i18n';
import type { DiscoveryLorePayload } from './game/types';
import {
  GamePhase,
  HudState,
  LevelConfig,
  LiveryId,
  OutcomeKind,
  ParcelKind,
  PlayerProgression,
  QuestKind,
  RunSnapshot,
  TopperId,
  UpgradeTrack,
  VehicleId,
} from './game/types';

function readInitialPhase(): GamePhase {
  if (typeof window === 'undefined') return GamePhase.Title;
  const params = new URLSearchParams(window.location.search);
  return params.get('autostart') === '1' ? GamePhase.Playing : GamePhase.Title;
}

function readInitialLevel(): number {
  if (typeof window === 'undefined') return 1;
  const params = new URLSearchParams(window.location.search);
  const parsed = Number(params.get('level'));
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

export default function App() {
  const [phase, setPhase] = useState<GamePhase>(readInitialPhase);
  const [activeLevel, setActiveLevel] = useState<number>(readInitialLevel);
  const [progression, setProgression] =
    useState<PlayerProgression>(loadProgression);
  const [highestUnlockedLevel, setHighestUnlockedLevel] = useState<number>(() => {
    const savedProg = loadProgression();
    const maxStarLvl = Object.keys(savedProg.districtStars).reduce(
      (acc, k) => Math.max(acc, Number(k) + 1),
      1,
    );
    return Math.max(1, readInitialLevel(), maxStarLvl);
  });
  const [runNonce, setRunNonce] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(false);
  const [snapshot, setSnapshot] = useState<RunSnapshot | null>(null);
  const [shopOpen, setShopOpen] = useState<boolean>(false);
  const [questsOpen, setQuestsOpen] = useState<boolean>(false);
  const [lang, setLang] = useState<SupportedLanguage>(getInitialLanguage);
  const [customCityConfig, setCustomCityConfig] =
    useState<LevelConfig | null>(null);
  const [customCityOpen, setCustomCityOpen] = useState<boolean>(false);
  const [worldTourOpen, setWorldTourOpen] = useState<boolean>(false);
  const [almanacOpen, setAlmanacOpen] = useState<boolean>(false);
  const [careerLedgerOpen, setCareerLedgerOpen] = useState<boolean>(false);
  const [careerLedgerTab, setCareerLedgerTab] = useState<CareerLedgerTab>('career');
  const [activeDiscovery, setActiveDiscovery] = useState<ActiveDiscoveryModalState | null>(null);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge>(() => getDailyChallenge());
  const [dailyProgress, setDailyProgress] = useState<DailyProgress | null>(() => loadDailyProgress());
  const [dailyStreak, setDailyStreak] = useState<DailyStreakState>(() => loadDailyStreak());
  const [lastShiftXp, setLastShiftXp] = useState<number>(0);
  const [lastDailyMedalResult, setLastDailyMedalResult] = useState<{
    medalEarned: 'none' | 'bronze' | 'silver' | 'gold';
    rewardCoins: number;
    spinTokensAwarded: number;
    streakBonusCoins: number;
  } | null>(null);

  const minimapRef = useRef<MinimapSnapshot>({
    city: null,
    truckX: 0,
    truckZ: 0,
    truckYaw: Math.PI / 2,
    activeStopIndex: 1,
  });

  // Garage upgrades live in permanent save state but the truck sim is a pure
  // function of the city, so push them into game/upgrades during render.
  applyUpgradeLevels(progression.upgrades);

  // Persist progression whenever wallet coins, quests, stars, or cosmetics update
  useEffect(() => {
    saveProgression(progression);
  }, [progression]);

  const initialCfg = getLevelConfig(activeLevel);
  const initialVehSpec =
    VEHICLE_SPECS[progression.selectedVehicle] ??
    VEHICLE_SPECS[VehicleId.ClassicVan];

  const [hud, setHud] = useState<HudState>({
    level: initialCfg.level,
    districtName: initialCfg.districtName,
    atmosphere: initialCfg.atmosphere,
    deliveredCount: 0,
    totalStops: initialCfg.stopCount,
    timeRemainingSec: initialCfg.timeLimitSec,
    score: 0,
    coins: progression.coins,
    bestScore: 0,
    combo: 0,
    comboTimer: 0,
    isFever: false,
    health: initialVehSpec.maxHealth,
    maxHealth: initialVehSpec.maxHealth,
    hasBumperShield: progression.nextFreeShield,
    greenWaveTimer: 0,
    nextStopIndex: 1,
    nextCustomerName: 'Maya',
    nextParcelLabel: 'Matcha Pocket Tin',
    nextParcelKind: ParcelKind.Small,
    nextVipRole: 'none',
    nextArchetype: 'chill',
    rushPromiseSec: -1,
    thermalPct: 0,
    fragileIntact: true,
    nextStopAppearance: null,
    distanceToStopMeters: 24,
    bearingToStopRad: 0,
    canExpressToss: false,
    canBullseyeToss: false,
    needsBrakeForLarge: false,
    isWrongWay: false,
    wrongWayProgress: 0,
    ticketsCount: 0,
    boostReady: true,
    boostCharge: 1,
    isBoosting: false,
    isDrifting: false,
    driftTier: 0,
    weatherKind: 'clear',
    speedKmh: 0,
    bannerEvent: null,
    countdownStage: null,
    rocketStartStatus: 'idle',
    demoActive: false,
    demoRemainingSec: 0,
  });

  // Pause simulation cleanly while any modal is open
  const anySubModalOpen =
    shopOpen ||
    questsOpen ||
    customCityOpen ||
    worldTourOpen ||
    almanacOpen ||
    careerLedgerOpen ||
    activeDiscovery !== null;
  const effectiveCanvasPhase =
    anySubModalOpen && phase === GamePhase.Playing ? GamePhase.Paused : phase;

  // Mirror state machine to document.body.dataset.state & sync background music loop
  useEffect(() => {
    document.body.dataset.state = effectiveCanvasPhase;
    pokoAudio.setMusicPlaying(effectiveCanvasPhase === GamePhase.Playing);
  }, [effectiveCanvasPhase]);

  const startPlaying = useCallback((targetLevel?: number) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setShopOpen(false);
    setWorldTourOpen(false);
    setAlmanacOpen(false);
    setCareerLedgerOpen(false);
    setActiveDiscovery(null);
    setLastShiftXp(0);
    setLastDailyMedalResult(null);
    setRunMode({ kind: 'free', level: targetLevel !== undefined ? targetLevel : activeLevel });
    setCustomCityOpen(false);
    document.body.dataset.state = GamePhase.Playing;
    if (targetLevel !== undefined) {
      setActiveLevel(targetLevel);
    }
    setSnapshot(null);
    setRunMode({ kind: 'free', level: targetLevel !== undefined ? targetLevel : activeLevel });
    setRunNonce((n) => n + 1);
    setPhase(GamePhase.Playing);
    pokoAudio.playStartChime();
    pokoAudio.setMusicPlaying(true);
    const canvas = document.querySelector('canvas');
    if (canvas instanceof HTMLElement) {
      canvas.focus();
    }
  }, [activeLevel]);

  const handleStartDaily = useCallback(() => {
    const challenge = getDailyChallenge();
    setDailyChallenge(challenge);
    startPlaying(challenge.level);
    setRunMode({
      kind: 'daily',
      level: challenge.level,
      seed: challenge.seed,
      dateKey: challenge.dateKey,
      timeLimitSec: challenge.timeLimitSec,
    });
  }, [startPlaying]);
  const handleRestart = useCallback(() => {

    startPlaying(activeLevel);
  }, [activeLevel, startPlaying]);

  const handleNextLevel = useCallback(() => {
    const worldId = snapshot?.customCity?.worldCityId;
    const worldStage = snapshot?.customCity?.worldStage ?? 1;
    if (worldId && worldStage < 10) {
      const worldCity = getWorldCityById(worldId);
      if (worldCity) {
        const nextCfg = buildWorldCityLevelConfig(worldCity, worldStage + 1);
        setCustomCityConfig(nextCfg);
        startPlaying(nextCfg.level);
        return;
      }
    }
    setCustomCityConfig(null);
    const nextLvl = (snapshot?.level ?? activeLevel) + 1;
    setHighestUnlockedLevel((prev) => Math.max(prev, nextLvl));
    startPlaying(nextLvl);
  }, [activeLevel, snapshot, startPlaying]);

  const handleToggleMute = useCallback(() => {
    const nextMuted = pokoAudio.toggleMute();
    setMuted(nextMuted);
  }, []);

  const handleToggleLang = useCallback(() => {
    setLang((prev) => {
      const next: SupportedLanguage = prev === 'zh' ? 'en' : 'zh';
      saveLanguagePreference(next);
      return next;
    });
  }, []);

  const handleSelectCustomCity = useCallback(
    (cfg: LevelConfig) => {
      setCustomCityConfig(cfg);
      setCustomCityOpen(false);
      setWorldTourOpen(false);
      startPlaying(cfg.level);
    },
    [startPlaying],
  );

  const handleDiscoverLore = useCallback(
    (payload: DiscoveryLorePayload) => {
      setProgression((prev) => {
        const res = recordLoreDiscovery(prev, payload.loreId);
        if (res.isFirstDiscovery || prev.alwaysShowDiscoveryModal) {
          setActiveDiscovery({ ...payload, isFirstDiscovery: res.isFirstDiscovery });
        }
        return res.next;
      });
    },
    [],
  );

  const handleClearCustomCity = useCallback(() => {
    setCustomCityConfig(null);
  }, []);

  const handleAwardLiveCoins = useCallback((delta: number) => {
    if (delta <= 0) return;
    setProgression((prev) => ({
      ...prev,
      coins: prev.coins + delta,
    }));
  }, []);

  const handleQuestEvent = useCallback(
    (kind: QuestKind, amount: number = 1) => {
      setProgression((prev) => incrementQuestProgress(prev, kind, amount));
    },
    [],
  );

  const handleConsumeStartShield = useCallback(() => {
    setProgression((prev) =>
      prev.nextFreeShield ? { ...prev, nextFreeShield: false } : prev,
    );
  }, []);

  const handleSelectOrBuyVehicle = useCallback((id: VehicleId) => {
    setProgression((prev) => purchaseOrSelectVehicle(prev, id).next);
  }, []);

  const handleSelectOrBuyTopper = useCallback((id: TopperId) => {
    setProgression((prev) => purchaseOrSelectTopper(prev, id).next);
  }, []);

  const handleSelectOrBuyLivery = useCallback((id: LiveryId) => {
    setProgression((prev) => purchaseOrSelectLivery(prev, id).next);
  }, []);

  const handleExchangeEarnings = useCallback(() => {
    setProgression((prev) => exchangeEarningsToCoins(prev).next);
  }, []);

  const handleClaimMilestone = useCallback((milestoneId: string) => {
    setProgression((prev) => claimCareerMilestone(prev, milestoneId).next);
  }, []);

  const handleDailyCheckIn = useCallback(() => {
    const res = claimDailyCheckIn(dailyStreak);
    if (!res.claimed) return;
    saveDailyStreak(res.nextStreak);
    setDailyStreak(res.nextStreak);
    setProgression((prev) => ({
      ...prev,
      coins: prev.coins + res.rewardCoins,
      spinTokens: prev.spinTokens + res.spinTokens,
      nextFreeShield: prev.nextFreeShield || res.freeShield,
    }));
  }, [dailyStreak]);

  const handlePurchaseUpgrade = useCallback((track: UpgradeTrack): boolean => {
    let bought = false;
    setProgression((prev) => {
      const res = purchaseUpgrade(prev, track);
      bought = res.reason === 'purchased';
      return bought ? res.progression : prev;
    });
    return bought;
  }, []);

  const handleClaimQuest = useCallback((questId: string) => {
    setProgression((prev) => claimQuest(prev, questId));
  }, []);

  const handleSpinWheel = useCallback((): {
    slice: SpinWheelSlice | null;
    usedToken: boolean;
  } => {
    let spinOut: { slice: SpinWheelSlice | null; usedToken: boolean } = {
      slice: null,
      usedToken: false,
    };
    setProgression((prev) => {
      const res = executeLuckySpin(prev);
      spinOut = { slice: res.slice, usedToken: res.usedToken };
      return res.next;
    });
    return spinOut;
  }, []);

  const handleRunFinished = useCallback((snap: RunSnapshot) => {
    setSnapshot(snap);
    setBestScore((prev) => Math.max(prev, snap.score));
    const xpGained = computeShiftCareerXp(snap);
    setLastShiftXp(xpGained);

    let dailyCoinsBonus = 0;
    let dailySpinTokensBonus = 0;
    if (getRunMode().kind === 'daily') {
      const result = recordDailyRun(dailyChallenge, dailyProgress, snap.score);
      saveDailyProgress(result.progress);
      setDailyProgress(result.progress);
      const streakRes = advanceChallengeStreak(
        dailyStreak,
        dailyChallenge.dateKey,
        result.medalEarned,
      );
      saveDailyStreak(streakRes.nextStreak);
      setDailyStreak(streakRes.nextStreak);
      dailyCoinsBonus = result.rewardCoins + streakRes.streakBonusCoins;
      dailySpinTokensBonus = result.spinTokensAwarded;
      setLastDailyMedalResult({
        medalEarned: result.medalEarned,
        rewardCoins: result.rewardCoins,
        spinTokensAwarded: result.spinTokensAwarded,
        streakBonusCoins: streakRes.streakBonusCoins,
      });
    } else {
      setLastDailyMedalResult(null);
    }

    setProgression((prev) => {
      const prevStars = prev.districtStars[snap.level] ?? 0;
      const nextStars = Math.max(prevStars, snap.starsEarned);
      let updated: PlayerProgression = {
        ...prev,
        coins: prev.coins + snap.coinsEarned + dailyCoinsBonus,
        spinTokens:
          prev.spinTokens + (snap.earnedSpinToken ? 1 : 0) + dailySpinTokensBonus,
        districtStars:
          !snap.customCity && nextStars > prevStars
            ? { ...prev.districtStars, [snap.level]: nextStars }
            : prev.districtStars,
      };
      updated = recordCareerShift(updated, snap).next;
      if (snap.customCity?.worldCityId && snap.customCity?.worldStage) {
        updated = recordWorldStageStars(
          updated,
          snap.customCity.worldCityId,
          snap.customCity.worldStage,
          snap.starsEarned,
        );
      }
      return updated;
    });
    if (snap.outcome === OutcomeKind.Victory && !snap.customCity) {
      setHighestUnlockedLevel((prev) => Math.max(prev, snap.level + 1));
    }
    setShopOpen(false);
    setQuestsOpen(false);
    pokoAudio.setMusicPlaying(false);
    document.body.dataset.state = GamePhase.GameOver;
    setPhase(GamePhase.GameOver);
  }, [dailyChallenge, dailyProgress, dailyStreak]);

  // Global keyboard shortcuts for Title Start, Mute [M], Restart [R], Garage [G], Quests [J], and Modal Escape
  useEffect(() => {
    const onGlobalKey = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (e.code === 'Escape' && (shopOpen || questsOpen || worldTourOpen || almanacOpen || careerLedgerOpen)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        pokoAudio.playUiClick();
        setShopOpen(false);
        setQuestsOpen(false);
        setWorldTourOpen(false);
        setAlmanacOpen(false);
        setCareerLedgerOpen(false);
        return;
      }

      if (anySubModalOpen) {
        return;
      }

      if (
        phase === GamePhase.Title &&
        (e.code === 'Enter' || e.code === 'Space')
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
        startPlaying(activeLevel);
        return;
      }
      if (
        phase === GamePhase.GameOver &&
        (e.code === 'Enter' || e.code === 'Space')
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (snapshot?.outcome === OutcomeKind.Victory) {
          handleNextLevel();
        } else {
          handleRestart();
        }
        return;
      }
      if (e.code === 'KeyM') {
        handleToggleMute();
      } else if (
        e.code === 'KeyG' &&
        (phase === GamePhase.Playing ||
          phase === GamePhase.Paused ||
          phase === GamePhase.GameOver)
      ) {
        pokoAudio.playUiClick();
        setQuestsOpen(false);
        setShopOpen((v) => !v);
      } else if (
        e.code === 'KeyJ' &&
        (phase === GamePhase.Playing || phase === GamePhase.Paused)
      ) {
        pokoAudio.playUiClick();
        setShopOpen(false);
        setQuestsOpen((v) => !v);
      } else if (
        e.code === 'KeyR' &&
        phase === GamePhase.Playing
      ) {
        handleRestart();
      }
    };
    window.addEventListener('keydown', onGlobalKey, true);
    return () => window.removeEventListener('keydown', onGlobalKey, true);
  }, [
    phase,
    activeLevel,
    snapshot,
    shopOpen,
    questsOpen,
    worldTourOpen,
    almanacOpen,
    careerLedgerOpen,
    anySubModalOpen,
    startPlaying,
    handleNextLevel,
    handleRestart,
    handleToggleMute,
  ]);

  const hasClaimableQuest = progression.quests.some(
    (q) => q.progress >= q.target && !q.claimed,
  );
  const hasFreeSpin = progression.spinTokens > 0;
  const careerState = normalizeCareerState(progression.career);
  const rankInfo = getRiderRankInfo(careerState.careerXp);
  const checkInAvailable = canCheckInToday(dailyStreak);
  const displayCheckInStreak = getDisplayCheckInStreak(dailyStreak);
  const hasLedgerNotice =
    hasClaimableMilestone(progression) ||
    careerState.unconvertedYuan >= 1 ||
    checkInAvailable;
  const isTodayDaily = Boolean(
    dailyProgress && dailyProgress.dateKey === dailyChallenge.dateKey,
  );
  const syncedHud: HudState = {
    ...hud,
    coins: hud.demoActive ? hud.coins : progression.coins,
  };

  return (
    <main className="relative w-full h-full overflow-hidden select-none">
      <GameCanvas
        phase={effectiveCanvasPhase}
        activeLevel={activeLevel}
        customCityConfig={customCityConfig}
        runNonce={runNonce}
        bestScore={bestScore}
        selectedVehicle={progression.selectedVehicle}
        selectedTopper={progression.selectedTopper}
        selectedLivery={progression.selectedLivery ?? LiveryId.Standard}
        walletCoins={progression.coins}
        startWithShield={progression.nextFreeShield}
        minimapRef={minimapRef}
        onHudUpdate={setHud}
        onPhaseChange={setPhase}
        onRunFinished={handleRunFinished}
        onAwardLiveCoins={handleAwardLiveCoins}
        onQuestEvent={handleQuestEvent}
        onConsumeStartShield={handleConsumeStartShield}
        onDiscoverLore={handleDiscoverLore}
      />

      {phase === GamePhase.Title && (
        <TitleOverlay
          selectedLevel={activeLevel}
          highestUnlockedLevel={highestUnlockedLevel}
          muted={muted}
          lang={lang}
          customCityConfig={customCityConfig}
          onToggleLang={handleToggleLang}
          onOpenCustomCity={() => setCustomCityOpen(true)}
          onOpenWorldTour={() => setWorldTourOpen(true)}
          onOpenAlmanac={() => setAlmanacOpen(true)}
          onOpenCareerLedger={(tab = 'career') => {
            setCareerLedgerTab(tab);
            setCareerLedgerOpen(true);
          }}
          onClearCustomCity={handleClearCustomCity}
          onSelectLevel={(lvl) => {
            setCustomCityConfig(null);
            setActiveLevel(lvl);
          }}
          onStart={() => startPlaying(activeLevel)}
          onStartDaily={handleStartDaily}
          careerSummary={{
            rankBadge: rankInfo.current.badge,
            rankName: lang === 'zh' ? rankInfo.current.nameZh : rankInfo.current.nameEn,
            unconvertedYuan: careerState.unconvertedYuan,
            exchangeRate: rankInfo.current.exchangeRate,
            hasLedgerNotice,
          }}
          daily={{
            dateKey: dailyChallenge.dateKey,
            targetScore: dailyChallenge.targetScore,
            silverScore: dailyChallenge.silverScore,
            goldScore: dailyChallenge.goldScore,
            rewardCoins: dailyChallenge.rewardCoins,
            bestScore: isTodayDaily && dailyProgress ? dailyProgress.bestScore : 0,
            bestMedal: isTodayDaily && dailyProgress ? dailyProgress.bestMedal : 'none',
            claimedMedals:
              isTodayDaily && dailyProgress?.claimedMedals
                ? dailyProgress.claimedMedals
                : { bronze: false, silver: false, gold: false },
            cleared: Boolean(isTodayDaily && dailyProgress?.claimed),
            checkInStreakDays: displayCheckInStreak,
            challengeStreakDays: dailyStreak.challengeStreakDays,
            canCheckInToday: checkInAvailable,
          }}
          onToggleMute={handleToggleMute}
        />
      )}

      {phase === GamePhase.Playing && (
        <GameHud
          hud={syncedHud}
          minimapRef={minimapRef}
          muted={muted}
          lang={lang}
          hasClaimableQuest={hasClaimableQuest}
          hasFreeSpin={hasFreeSpin}
          onToggleMute={handleToggleMute}
          onToggleLang={handleToggleLang}
          onPause={() => {
            pokoAudio.playUiClick();
            setShopOpen(false);
            setQuestsOpen(false);
            setPhase(GamePhase.Paused);
          }}
          onOpenQuests={() => {
            pokoAudio.playUiClick();
            setShopOpen(false);
            setQuestsOpen(true);
          }}
          onOpenShop={() => {
            pokoAudio.playUiClick();
            setQuestsOpen(false);
            setShopOpen(true);
          }}
          onRestart={handleRestart}
        />
      )}

      {!anySubModalOpen && (
        <StatusModal
          phase={phase}
          snapshot={snapshot}
          currentLevel={activeLevel}
          lang={lang}
          careerRankInfo={{
            badge: rankInfo.current.badge,
            nameZh: rankInfo.current.nameZh,
            nameEn: rankInfo.current.nameEn,
            exchangeRate: rankInfo.current.exchangeRate,
            xpGained: lastShiftXp,
            unconvertedYuan: careerState.unconvertedYuan,
          }}
          dailyMedalResult={lastDailyMedalResult}
          onExchangeEarnings={handleExchangeEarnings}
          onOpenCareerLedger={() => {
            setCareerLedgerTab('career');
            setCareerLedgerOpen(true);
          }}
          onOpenCustomCity={() => setCustomCityOpen(true)}
          onOpenWorldTour={() => setWorldTourOpen(true)}
          onResume={() => {
            document.body.dataset.state = GamePhase.Playing;
            setPhase(GamePhase.Playing);
          }}
          onRestart={handleRestart}
          onNextLevel={handleNextLevel}
          onOpenShop={() => {
            pokoAudio.playUiClick();
            setShopOpen(true);
          }}
          onBackToTitle={() => {
            document.body.dataset.state = GamePhase.Title;
            setPhase(GamePhase.Title);
          }}
        />
      )}

      <GarageShopModal
        open={shopOpen}
        progression={progression}
        lang={lang}
        onSelectOrBuyVehicle={handleSelectOrBuyVehicle}
        onSelectOrBuyTopper={handleSelectOrBuyTopper}
        onSelectOrBuyLivery={handleSelectOrBuyLivery}
        onSpinWheel={handleSpinWheel}
        onPurchaseUpgrade={handlePurchaseUpgrade}
        onClose={() => setShopOpen(false)}
      />

      {careerLedgerOpen && (
        <Suspense fallback={null}>
      <CareerLedgerModal
        open={careerLedgerOpen}
        initialTab={careerLedgerTab}
        lang={lang}
        progression={progression}
        dailyChallenge={dailyChallenge}
        dailyProgress={dailyProgress}
        dailyStreak={dailyStreak}
        onExchangeEarnings={handleExchangeEarnings}
        onClaimMilestone={handleClaimMilestone}
        onDailyCheckIn={handleDailyCheckIn}
        onStartDaily={handleStartDaily}
        onClose={() => setCareerLedgerOpen(false)}
      />
        </Suspense>
      )}

      <QuestsRulesModal
        open={questsOpen}
        progression={progression}
        lang={lang}
        onClaimQuest={handleClaimQuest}
        onClose={() => setQuestsOpen(false)}
      />

      <CustomCityModal
        open={customCityOpen}
        lang={lang}
        onClose={() => setCustomCityOpen(false)}
        onSelectCustomCity={handleSelectCustomCity}
      />

      {worldTourOpen && (
        <Suspense fallback={null}>
      <WorldMapModal
        open={worldTourOpen}
        lang={lang}
        progression={progression}
        onSelectWorldStage={handleSelectCustomCity}
        onClose={() => setWorldTourOpen(false)}
      />
        </Suspense>
      )}

      {almanacOpen && (
        <Suspense fallback={null}>
      <AlmanacModal
        open={almanacOpen}
        lang={lang}
        progression={progression}
        onClose={() => setAlmanacOpen(false)}
      />
        </Suspense>
      )}

      {activeDiscovery && (
        <Suspense fallback={null}>
      <DiscoveryModal
        item={activeDiscovery}
        lang={lang}
        alwaysShowEveryStop={progression.alwaysShowDiscoveryModal ?? true}
        onToggleAlwaysShow={(nextVal) =>
          setProgression((prev) => ({
            ...prev,
            alwaysShowDiscoveryModal: nextVal,
          }))
        }
        onConfirmDeliver={() => setActiveDiscovery(null)}
      />
        </Suspense>
      )}
    </main>
  );
}
