import { useEffect, useRef } from 'react';
import type { MinimapSnapshot } from './GameHud';
import {
  type DiscoveryLorePayload,
  type GamePhase,
  type HudState,
  type LevelConfig,
  LiveryId,
  type QuestKind,
  type RunSnapshot,
  type TopperId,
  type VehicleId,
} from '../game/types';
import { createCanvasRuntime } from './canvas/runtime';

// Thin React shell: it owns nothing but prop refs and the mount point.
// The renderer, simulation loop and all mutable runtime state live in canvas/runtime.ts.
export interface GameCanvasProps {
  phase: GamePhase;
  activeLevel: number;
  runNonce: number; // Increments on Restart or New Run
  bestScore: number;
  selectedVehicle: VehicleId;
  selectedTopper: TopperId;
  selectedLivery?: LiveryId;
  walletCoins: number;
  startWithShield: boolean;
  minimapRef: React.RefObject<MinimapSnapshot>;
  customCityConfig?: LevelConfig | null;
  onHudUpdate: (hud: HudState) => void;
  onPhaseChange: (nextPhase: GamePhase) => void;
  onRunFinished: (snapshot: RunSnapshot) => void;
  onAwardLiveCoins: (delta: number) => void;
  onQuestEvent: (kind: QuestKind, amount?: number) => void;
  onConsumeStartShield: () => void;
  onDiscoverLore?: (payload: DiscoveryLorePayload) => void;
}

export function GameCanvas({
  phase,
  activeLevel,
  runNonce,
  bestScore,
  selectedVehicle,
  selectedTopper,
  selectedLivery = LiveryId.Standard,
  walletCoins,
  startWithShield,
  minimapRef,
  customCityConfig,
  onHudUpdate,
  onPhaseChange,
  onRunFinished,
  onAwardLiveCoins,
  onQuestEvent,
  onConsumeStartShield,
  onDiscoverLore,
}: GameCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const minimapSnapRef = useRef(minimapRef);
  minimapSnapRef.current = minimapRef;

  // Store latest props/callbacks in refs so HUD state never recreates WebGL context!
  const phaseRef = useRef(phase);
  const levelRef = useRef(activeLevel);
  const bestScoreRef = useRef(bestScore);
  const vehicleRef = useRef(selectedVehicle);
  const topperRef = useRef(selectedTopper);
  const liveryRef = useRef(selectedLivery);
  const walletCoinsRef = useRef(walletCoins);
  const startShieldRef = useRef(startWithShield);
  const customCityConfigRef = useRef(customCityConfig);
  const onHudUpdateRef = useRef(onHudUpdate);
  const onPhaseChangeRef = useRef(onPhaseChange);
  const onRunFinishedRef = useRef(onRunFinished);
  const onAwardLiveCoinsRef = useRef(onAwardLiveCoins);
  const onQuestEventRef = useRef(onQuestEvent);
  const onConsumeStartShieldRef = useRef(onConsumeStartShield);
  const onDiscoverLoreRef = useRef(onDiscoverLore ?? (() => {}));

  phaseRef.current = phase;
  levelRef.current = activeLevel;
  bestScoreRef.current = bestScore;
  vehicleRef.current = selectedVehicle;
  topperRef.current = selectedTopper;
  liveryRef.current = selectedLivery;
  walletCoinsRef.current = walletCoins;
  startShieldRef.current = startWithShield;
  customCityConfigRef.current = customCityConfig;
  onHudUpdateRef.current = onHudUpdate;
  onPhaseChangeRef.current = onPhaseChange;
  onRunFinishedRef.current = onRunFinished;
  onAwardLiveCoinsRef.current = onAwardLiveCoins;
  onQuestEventRef.current = onQuestEvent;
  onConsumeStartShieldRef.current = onConsumeStartShield;
  onDiscoverLoreRef.current = onDiscoverLore ?? (() => {});

  // Function pointers to rebuild level scene or swap cosmetics cleanly without tearing down WebGL
  const loadLevelFnRef = useRef<((lvl: number, resetScore: boolean, customCfg?: LevelConfig | null) => void) | null>(
    null,
  );
  const syncCosmeticsFnRef = useRef<
    ((veh: VehicleId, top: TopperId, liv: LiveryId) => void) | null
  >(null);
  const prevLevelRef = useRef<number>(activeLevel);
  const prevNonceRef = useRef<number>(runNonce);


  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const runtime = createCanvasRuntime({
      container,
      refs: {
        phaseRef,
        levelRef,
        bestScoreRef,
        vehicleRef,
        topperRef,
        liveryRef,
        walletCoinsRef,
        startShieldRef,
        customCityConfigRef,
        onHudUpdateRef,
        onPhaseChangeRef,
        onRunFinishedRef,
        onAwardLiveCoinsRef,
        onQuestEventRef,
        onConsumeStartShieldRef,
        onDiscoverLoreRef,
        minimapSnapRef,
        loadLevelFnRef,
        syncCosmeticsFnRef,
      },
    });

    return () => runtime.dispose();
  }, []);

  const prevCustomCityRef = useRef<LevelConfig | null | undefined>(customCityConfig);

  // Trigger clean level rebuild when activeLevel, runNonce, or customCityConfig changes without tearing down WebGLRenderer!
  useEffect(() => {
    if (
      prevLevelRef.current !== activeLevel ||
      prevNonceRef.current !== runNonce ||
      prevCustomCityRef.current !== customCityConfig
    ) {
      const resetScore =
        activeLevel === 1 ||
        prevNonceRef.current !== runNonce ||
        prevCustomCityRef.current !== customCityConfig;
      prevLevelRef.current = activeLevel;
      prevNonceRef.current = runNonce;
      prevCustomCityRef.current = customCityConfig;
      loadLevelFnRef.current?.(activeLevel, resetScore, customCityConfig);
    }
  }, [activeLevel, runNonce, customCityConfig]);

  // Swap 3D vehicle body, roof topper, & paint livery live when equipped in Garage Shop!
  useEffect(() => {
    syncCosmeticsFnRef.current?.(selectedVehicle, selectedTopper, selectedLivery);
  }, [selectedVehicle, selectedTopper, selectedLivery]);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 w-full h-full overflow-hidden"
      aria-label="Deliveer 3D Toy City Viewport"
    />
  );
}
