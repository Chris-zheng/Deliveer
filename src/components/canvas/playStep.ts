import type * as THREE from 'three';
import {
  COMBO_WINDOW_SEC,
  FEVER_COMBO_THRESHOLD,
  ROCKET_START_POINTS,
} from '../../config/balance';
import { pokoAudio } from '../../game/audio';
import { stepDemoDirector } from '../../game/demoDirector';
import { VEHICLE_SPECS, computeRunRewards } from '../../game/progression';
import {
  applyRocketStartToTruck,
  checkDeliveryEligibility,
  createParcelStackWobbleState,
  evaluateRunStatus,
  getActiveStop,
  stepCoffeeKiosks,
  stepDuckCrossings,
  stepHazardsAndCollisions,
  stepMechanicGarages,
  stepMovingCustomers,
  stepPedestriansPhysics,
  stepRivalCourier,
  stepStartCountdown,
  stepTrafficSignals,
  stepTruckPhysics,
  triggerMusicalHorn,
} from '../../game/rules';
import { HazardKind, OutcomeKind, ParcelKind, ShiftAtmosphere, VehicleId } from '../../game/types';
import type {
  CrashEvent,
  QuestKind,
  RiderShiftReceipt,
  RunSnapshot,
} from '../../game/types';
import type { ToyTruckRig } from '../../game/meshes';
import { touchControls } from '../../game/touchControls';
import { type EffectsSystem } from './effects';
import type { InputState } from './input';
import type { RuntimeState } from './runtimeState';
import { updateCameraFraming, type CameraFramingDeps } from './cameraFrame';

interface HasCurrent<T> {
  current: T;
}

// Runtime-owned handles and closures the "Playing" branch needs.
export interface PlayStepDeps {
  fx: EffectsSystem;
  spawnParticleBurst: EffectsSystem['spawnParticleBurst'];
  input: InputState;
  clearAllInputs: () => void;
  truckRig: ToyTruckRig;
  cameraFramingDeps: CameraFramingDeps;
  bestScoreRef: HasCurrent<number>;
  onRunFinishedRef: HasCurrent<(snapshot: RunSnapshot) => void>;
  awardRunCoins: (delta: number) => void;
  recordQuestEvent: (kind: QuestKind, amount?: number) => void;
  emitHudSnapshot: () => void;
  refreshForwardRoadPath: () => void;
  syncMinimapSnapshot: () => void;
  syncTruckParcelStack: () => void;
  screenToWorldOnRoad: (clientX: number, clientY: number) => THREE.Vector3 | null;
  triggerParcelDelivery: (viaExpressToss: boolean, isBullseye?: boolean) => void;
  startDemoReel: () => void;
  stopDemoReel: () => void;
}

// The "Playing" branch of the frame: input, traffic, hazards, deliveries, scoring and HUD push.
export function stepPlay(
  dt: number,
  cdDt: number,
  now: number,
  S: RuntimeState,
  deps: PlayStepDeps,
): void {
  const {
    fx,
    spawnParticleBurst,
    input,
    clearAllInputs,
    truckRig,
    cameraFramingDeps,
    bestScoreRef,
    onRunFinishedRef,
    awardRunCoins,
    recordQuestEvent,
    emitHudSnapshot,
    refreshForwardRoadPath,
    syncMinimapSnapshot,
    syncTruckParcelStack,
    screenToWorldOnRoad,
    triggerParcelDelivery,
    startDemoReel,
    stopDemoReel,
  } = deps;
        // Toggle 45-second Choreographed Demo Reel [Bottom HUD Timer Button or T]
        if (touchControls.demoTogglePulse || input.keysJustPressed.has('KeyT')) {
          touchControls.demoTogglePulse = false;
          input.keysJustPressed.delete('KeyT');
          if (S.demoState.active) {
            stopDemoReel();
          } else {
            startDemoReel();
          }
        }

        const demoOut = S.demoState.active
          ? stepDemoDirector(
              S.demoState,
              S.truckState,
              S.currentCity,
              S.cachedRoadPath,
              S.countdownState.stage,
              cdDt,
            )
          : null;

        if (demoOut?.completed) {
          stopDemoReel();
        } else {
          if (demoOut?.changedVehicle) {
            const nextVeh = demoOut.changedVehicle.vehicleId;
            const nextTop = demoOut.changedVehicle.topperId;
            truckRig.setVehicleStyle(nextVeh);
            truckRig.setTopper(nextTop);
            const spec =
              VEHICLE_SPECS[nextVeh] ?? VEHICLE_SPECS[VehicleId.ClassicVan];
            S.truckState.vehicleId = nextVeh;
            S.truckState.maxHealth = spec.maxHealth;
            S.truckState.health = spec.maxHealth;
            S.truckState.shockAbsorberAvailable = spec.hasShockAbsorber;
            S.truckState.squashY = 1.15;
            S.truckState.squashVel = -2.2;
            spawnParticleBurst(
              S.truckState.x,
              0.7,
              S.truckState.z,
              18,
              [0xffe524, 0x38bdf8, 0xff70a6, 0xffffff],
              1.1,
            );
          }

          if (demoOut?.changedScene) {
            S.camYaw = S.truckState.yaw;
            S.parcelWobble = createParcelStackWobbleState(S.truckState.yaw);
            S.lastPathCalcTime = -1;
            syncTruckParcelStack();
            refreshForwardRoadPath();
            if (demoOut.changedScene === 'scene2_bullseye_fever') {
              S.combo = 2;
              S.comboTimer = COMBO_WINDOW_SEC;
              S.bannerEvent = {
                id: ++S.bannerSeq,
                label: 'Kei Truck · Bullseye Rush!',
                detail: 'Curbside Toss & 2x Fever Showcase',
                tone: 'emerald',
              };
              S.bannerTimer = 1.5;
            } else if (demoOut.changedScene === 'scene3_canal_jump') {
              S.bannerEvent = {
                id: ++S.bannerSeq,
                label: 'Zippy Trike · Canal Stunt!',
                detail: 'Lining Up on Yellow Jump Ramp!',
                tone: 'amber',
              };
              S.bannerTimer = 1.4;
            } else if (demoOut.changedScene === 'scene4_clash_shield') {
              pokoAudio.setFeverMode(false);
              S.combo = 0;
              S.comboTimer = 0;
              S.bannerEvent = {
                id: ++S.bannerSeq,
                label: 'Step-Van · Rush-Hour Clash!',
                detail: '3D Traffic Impact & Shield Pit-Stop',
                tone: 'amber',
              };
              S.bannerTimer = 1.45;
            } else if (demoOut.changedScene === 'scene5_finale_orbit') {
              S.finishDelayTimer = -1;
              S.pendingOutcome = OutcomeKind.None;
              S.bannerEvent = {
                id: ++S.bannerSeq,
                label: 'Final Parcel · Stage Finale!',
                detail: 'Delivering Last Package!',
                tone: 'emerald',
              };
              S.bannerTimer = 1.4;
            }
            emitHudSnapshot();
          }

          if (demoOut?.triggerGarageSaveShowcase) {
            S.truckState.hasBumperShield = true;
            S.truckState.health = S.truckState.maxHealth;
            pokoAudio.playMechanicWrench();
            S.bannerEvent = {
              id: ++S.bannerSeq,
              label: 'Wrench Pit-Stop!',
              detail: 'Hull Repaired & Bumper Shield Ready!',
              tone: 'emerald',
            };
            S.bannerTimer = 1.75;
            spawnParticleBurst(
              S.truckState.x,
              0.8,
              S.truckState.z,
              16,
              [0x38bdf8, 0xffdf24, 0xffffff],
              1.05,
            );
            emitHudSnapshot();
          }
        }

        if (input.spaceBufferTimer > 0) {
          input.spaceBufferTimer = Math.max(0, input.spaceBufferTimer - dt);
        }

        // Ambient Sunny & Sunset Songbird Chirps!
        if (S.currentCity.config.atmosphere !== ShiftAtmosphere.TwilightNeon) {
          S.birdChirpTimer -= dt;
          if (S.birdChirpTimer <= 0) {
            S.birdChirpTimer = 3.8 + Math.random() * 3.8;
            pokoAudio.playBirdChirp(
              S.currentCity.config.atmosphere === ShiftAtmosphere.SunnyHarbor
                ? 0.82
                : 0.6,
            );
          }
        }

        // Quick-skip flyover if player explicitly presses Enter after overview has begun
        if (
          !S.demoState.active &&
          S.countdownState.isFrozen &&
          S.countdownState.remainingSec > 0.06 &&
          S.countdownState.remainingSec < S.countdownState.totalSec - 0.3 &&
          input.keysJustPressed.has('Enter')
        ) {
          S.countdownState.remainingSec = 0.03;
        }

        const gasHeldForCountdown = S.demoState.active
          ? Boolean(demoOut?.gasForCountdown)
          : input.keysHeld.has('KeyW') ||
            input.keysHeld.has('ArrowUp') ||
            touchControls.gas ||
            input.pointerDown;

        if (S.countdownState.isFrozen || S.countdownState.stage !== null) {
          const prevRocketStatus = S.countdownState.rocketStatus;
          const cdEv = stepStartCountdown(
            S.countdownState,
            gasHeldForCountdown,
            cdDt,
          );

          if (cdEv.changedStage !== null) {
            if (
              cdEv.changedStage === 3 ||
              cdEv.changedStage === 2 ||
              cdEv.changedStage === 1 ||
              cdEv.changedStage === 0
            ) {
              pokoAudio.playCountdownBeep(cdEv.changedStage);
            }
          }

          if (S.countdownState.isFrozen) {
            // Keep living island animated while shift timer & van position stay frozen!
            stepTrafficSignals(S.currentCity.trafficSignals, dt * 0.9);
            stepPedestriansPhysics(
              S.currentCity.pedestrians,
              S.currentCity,
              S.truckState,
              dt * 0.9,
            );
            stepMovingCustomers(S.currentCity.stops, S.visualClock);

            if (cdEv.triggeredSputter) {
              pokoAudio.playEngineSputter();
              S.truckState.squashY = 1.09;
              spawnParticleBurst(
                S.truckState.x - Math.sin(S.truckState.yaw) * 0.95,
                0.35,
                S.truckState.z - Math.cos(S.truckState.yaw) * 0.95,
                6,
                [0x94a3b8, 0xcbd5e1, 0x64748b],
                0.55,
              );
            } else if (cdEv.revIntensity > 0) {
              pokoAudio.playCountdownRev(cdEv.revIntensity);
              S.truckState.squashY =
                1 + Math.sin(S.visualClock * 42) * 0.045 * cdEv.revIntensity;
              S.revExhaustAccum += dt;
              if (S.revExhaustAccum > 0.11) {
                S.revExhaustAccum = 0;
                spawnParticleBurst(
                  S.truckState.x - Math.sin(S.truckState.yaw) * 0.92,
                  0.34,
                  S.truckState.z - Math.cos(S.truckState.yaw) * 0.92,
                  S.countdownState.rocketStatus === 'primed' ? 4 : 2,
                  S.countdownState.rocketStatus === 'primed'
                    ? [0xffe524, 0xff9f1c, 0xffffff]
                    : [0xffffff, 0xe2e8f0],
                  0.52,
                );
              }
            } else {
              S.truckState.squashY += (1 - S.truckState.squashY) * Math.min(1, dt * 10);
            }
          }

          if (cdEv.justUnlockedGo) {
            if (cdEv.triggeredRocketStart) {
              applyRocketStartToTruck(S.truckState);
              S.score += ROCKET_START_POINTS;
              pokoAudio.playRocketStart();
              S.windStreakTimer = 0.9;
              S.cameraTrauma = Math.max(S.cameraTrauma, 0.28);
              spawnParticleBurst(
                S.truckState.x - Math.sin(S.truckState.yaw) * 0.95,
                0.42,
                S.truckState.z - Math.cos(S.truckState.yaw) * 0.95,
                22,
                [0xffe524, 0xff9f1c, 0x70e4ff, 0xffffff],
                1.35,
              );
              S.bannerEvent = {
                id: ++S.bannerSeq,
                label: 'Rocket Start!',
                detail: `+${ROCKET_START_POINTS} pts · Turbo Launch!`,
                tone: 'emerald',
              };
              S.bannerTimer = 1.95;
            } else if (cdEv.triggeredSputter) {
              pokoAudio.playEngineSputter();
              S.bannerEvent = {
                id: ++S.bannerSeq,
                label: 'Early Gas Sputter!',
                detail: 'Hold Gas on "1" Next Time!',
                tone: 'amber',
              };
              S.bannerTimer = 1.45;
            }
          }

          if (
            cdEv.changedStage !== null ||
            prevRocketStatus !== S.countdownState.rocketStatus ||
            cdEv.justUnlockedGo
          ) {
            emitHudSnapshot();
          }
        }

        // Simulation-level Hitstop on heavy impacts
        let simDt = S.countdownState.isFrozen ? 0 : dt;
        if (S.hitstopTimer > 0) {
          S.hitstopTimer = Math.max(0, S.hitstopTimer - dt);
          simDt = 0;
        }

        if (simDt > 0 && S.finishDelayTimer < 0) {
          S.elapsedSec += simDt;
          S.timeRemainingSec = Math.max(0, S.timeRemainingSec - simDt);

          // Countdown tick audio cue on final 10 seconds
          const ceilSec = Math.ceil(S.timeRemainingSec);
          if (ceilSec > 0 && ceilSec <= 10 && ceilSec !== S.lastTickedSecond) {
            S.lastTickedSecond = ceilSec;
            pokoAudio.playTimerTick(ceilSec <= 5);
          }

          if (S.comboTimer > 0) {
            S.comboTimer = Math.max(0, S.comboTimer - simDt);
            if (S.comboTimer <= 0) {
              S.combo = 0;
              pokoAudio.setFeverMode(false);
            }
          }

          // Google Maps Heading-Up Vehicle-Relative Controls (Keyboard + Multi-Touch Mobile Deck, or Demo Autopilot):
          let throttle = 0;
          let steer = 0;
          let wantsHorn = false;
          if (S.demoState.active && demoOut) {
            throttle = demoOut.throttle;
            steer = demoOut.steer;
            wantsHorn = demoOut.wantsHorn;
            touchControls.hornPulse = false;
          } else {
            if (input.keysHeld.has('KeyW') || input.keysHeld.has('ArrowUp') || touchControls.gas) {
              throttle += 1;
            }
            if (input.keysHeld.has('KeyS') || input.keysHeld.has('ArrowDown') || touchControls.brake) {
              throttle -= 1;
            }
            if (input.keysHeld.has('KeyA') || input.keysHeld.has('ArrowLeft')) steer -= 1;
            if (input.keysHeld.has('KeyD') || input.keysHeld.has('ArrowRight')) steer += 1;
            if (touchControls.steerTouchActive) {
              steer += touchControls.steerAnalog;
            } else {
              if (touchControls.steerLeft) steer -= 1;
              if (touchControls.steerRight) steer += 1;
            }
            throttle = Math.max(-1, Math.min(1, throttle));
            steer = Math.max(-1, Math.min(1, steer));

            wantsHorn =
              input.keysJustPressed.has('KeyQ') ||
              input.keysJustPressed.has('KeyH') ||
              touchControls.hornPulse;
            touchControls.hornPulse = false;
          }

          // Musical Horn [Q / H / Mobile Horn Button]
          if (wantsHorn) {
            const hornRes = triggerMusicalHorn(
              S.truckState,
              S.currentCity.hazards,
              S.currentCity.pedestrians,
              S.currentCity.duckCrossings,
            );
            if (hornRes) {
              pokoAudio.playMusicalHorn();
              S.truckState.squashY = 1.12;
              S.truckState.squashVel = -2.0;
              if (hornRes.calmedScooters > 0 || hornRes.hurriedDucks > 0) {
                S.bannerEvent = {
                  id: ++S.bannerSeq,
                  label:
                    hornRes.calmedScooters > 0
                      ? 'Honk! Scooters Calmed!'
                      : 'Quack! Ducks Hurrying!',
                  detail: 'Friendly Musical Horn',
                  tone: 'emerald',
                };
                S.bannerTimer = 1.45;
                emitHudSnapshot();
              }
            }
          }

          const anyTouchDeckHeld =
            touchControls.gas ||
            touchControls.brake ||
            touchControls.steerTouchActive ||
            touchControls.steerLeft ||
            touchControls.steerRight;

          // Optional pointer hold-to-steer on the road (projected relative to van heading)
          if (
            !S.demoState.active &&
            !anyTouchDeckHeld &&
            Math.abs(throttle) < 0.01 &&
            Math.abs(steer) < 0.01 &&
            input.pointerDown
          ) {
            const worldPt = screenToWorldOnRoad(input.pointerClientX, input.pointerClientY);
            if (worldPt) {
              const dx = worldPt.x - S.truckState.x;
              const dz = worldPt.z - S.truckState.z;
              const dist = Math.hypot(dx, dz);
              if (dist > 0.45) {
                const fwdX = Math.sin(S.truckState.yaw);
                const fwdZ = Math.cos(S.truckState.yaw);
                const rightX = -Math.cos(S.truckState.yaw);
                const rightZ = Math.sin(S.truckState.yaw);
                const fwdDot = (dx * fwdX + dz * fwdZ) / dist;
                const rightDot = (dx * rightX + dz * rightZ) / dist;
                throttle = fwdDot < -0.35 ? -1 : 1;
                steer = Math.max(-1, Math.min(1, rightDot * 1.8));
              }
            }
          }

          const activeStop = getActiveStop(S.currentCity.stops);
          if (activeStop?.parcelKind === ParcelKind.HotExpress) {
            S.truckState.thermalTimer = Math.max(
              0,
              S.truckState.thermalTimer - simDt,
            );
          }

          const preElig = checkDeliveryEligibility(
            S.truckState,
            activeStop,
            S.currentCity.totalGridSize,
          );

          const usedTouchDeliver = S.demoState.active
            ? Boolean(demoOut?.wantsDeliver)
            : touchControls.deliverPulse;
          touchControls.deliverPulse = false;
          if (usedTouchDeliver) {
            input.spaceBufferTimer = 0.16;
          }

          // Consume buffered Space/E/Touch-Deliver: if in Express Toss range, toss parcel! Otherwise trigger Turbo Boost!
          let wantsBoost = S.demoState.active
            ? Boolean(demoOut?.wantsBoost)
            : input.keysJustPressed.has('ShiftLeft') ||
              input.keysJustPressed.has('ShiftRight') ||
              touchControls.boostPulse;
          touchControls.boostPulse = false;
          if (input.spaceBufferTimer > 0) {
            const demoBlockEarlyFinalDrop =
              S.demoState.active &&
              S.demoState.sceneId !== 'scene5_finale_orbit' &&
              S.currentCity.stops.filter((s) => !s.delivered).length <= 1;
            if (preElig.canExpressToss && !demoBlockEarlyFinalDrop) {
              input.spaceBufferTimer = 0;
              triggerParcelDelivery(true, preElig.canBullseyeToss);
            } else if (
              !S.demoState.active &&
              (input.keysJustPressed.has('Space') || usedTouchDeliver) &&
              S.truckState.boostCooldown <= 0
            ) {
              input.spaceBufferTimer = 0;
              wantsBoost = true;
            }
          }

          // Step intersection traffic signals (or force green during Green-Wave transponder!)
          stepTrafficSignals(S.currentCity.trafficSignals, simDt);

          const physEvents = stepTruckPhysics(
            S.truckState,
            {
              throttle,
              steer,
              wantsBoost,
              wantsDrift: S.demoState.active
                ? Boolean(demoOut?.wantsDrift)
                : input.keysHeld.has('KeyC'),
            },
            S.currentCity,
            simDt,
          );

          // Leafy boulevard breeze & songbird flutter when zooming past park trees!
          if (S.truckState.speed > 6.2 && S.treeFlutterCooldown <= 0) {
            for (let ti = 0; ti < S.currentCity.trees.length; ti++) {
              const tr = S.currentCity.trees[ti];
              if (tr.variant === 'bush') continue;
              const dTree = Math.hypot(S.truckState.x - tr.x, S.truckState.z - tr.z);
              if (dTree < 2.25) {
                S.treeFlutterCooldown = 2.8;
                spawnParticleBurst(
                  tr.x,
                  1.25,
                  tr.z,
                  5,
                  [tr.tintHex, 0xfef08a, 0xffffff],
                  0.62,
                );
                if (
                  S.currentCity.config.atmosphere !== ShiftAtmosphere.TwilightNeon
                ) {
                  pokoAudio.playBirdChirp(0.78);
                }
                break;
              }
            }
          }

          if (physEvents.issuedTicket) {
            const isWrongWayTicket = physEvents.issuedTicket === 'wrong_way';
            const penaltyPts = isWrongWayTicket ? 75 : 60;
            const fineYuan = isWrongWayTicket ? 8.0 : 6.0;
            S.riderTrafficFines += fineYuan;
            S.riderReviewScore = Math.max(3.0, Number((S.riderReviewScore - 0.15).toFixed(2)));
            S.lastEarningEvent = {
              id: ++S.earningSeq,
              label: isWrongWayTicket ? '逆行违章罚款' : '闯红灯罚款',
              amountYuan: -fineYuan,
              isReward: false,
            };
            S.earningEventTimer = 2.4;

            S.score = Math.max(0, S.score - penaltyPts);
            S.timeRemainingSec = Math.max(1, S.timeRemainingSec - 3);
            S.combo = 0;
            S.comboTimer = 0;
            pokoAudio.setFeverMode(false);
            pokoAudio.playTicketCitation();
            S.cameraTrauma = Math.max(S.cameraTrauma, 0.34);
            S.hitFlashTimer = 0.07;
            S.bannerEvent = {
              id: ++S.bannerSeq,
              label: isWrongWayTicket
                ? 'Wrong-Way Ticket!'
                : 'Red-Light Ticket!',
              detail: `-${penaltyPts} pts · -¥${fineYuan.toFixed(1)}`,
              tone: 'rose',
            };
            S.bannerTimer = 2.35;
            emitHudSnapshot();
          } else if (physEvents.activatedJumpRamp) {
            S.score += 80;
            pokoAudio.playJumpLaunch();
            S.windStreakTimer = Math.max(S.windStreakTimer, 0.65);
            S.cameraTrauma = Math.max(S.cameraTrauma, 0.28);
            S.bannerEvent = {
              id: ++S.bannerSeq,
              label: 'Canal Ramp Jump!',
              detail: '+80 pts · Air Stunt!',
              tone: 'emerald',
            };
            S.bannerTimer = 1.65;
            spawnParticleBurst(
              S.truckState.x,
              0.45,
              S.truckState.z,
              14,
              [0xffdf24, 0xffffff, 0x38bdf8],
              1.1,
            );
            emitHudSnapshot();
          } else if (physEvents.pickedGreenWave) {
            S.score += 75;
            pokoAudio.playCoffeePickup();
            S.bannerEvent = {
              id: ++S.bannerSeq,
              label: 'Green-Wave Transponder!',
              detail: '+75 pts · Signals Cleared 7.5s',
              tone: 'emerald',
            };
            S.bannerTimer = 1.85;
            spawnParticleBurst(
              S.truckState.x,
              0.65,
              S.truckState.z,
              14,
              [0x10b981, 0xfef08a, 0xffffff],
              1.0,
            );
            emitHudSnapshot();
          } else if (physEvents.splashedHydrantPos) {
            S.score += 40;
            pokoAudio.playHydrantSplash();
            spawnParticleBurst(
              physEvents.splashedHydrantPos.x,
              0.55,
              physEvents.splashedHydrantPos.z,
              18,
              [0x38bdf8, 0xbae6fd, 0xffffff],
              1.25,
            );
          } else if (
            physEvents.activatedManualBoost ||
            physEvents.triggeredBoostPad
          ) {
            pokoAudio.playBoost();
            S.windStreakTimer = Math.max(S.windStreakTimer, 0.45);
            S.cameraTrauma = Math.max(S.cameraTrauma, 0.24);
            spawnParticleBurst(
              S.truckState.x,
              0.38,
              S.truckState.z,
              10,
              [0xffffff, 0x70d6ff, 0x38e4ae],
              0.85,
            );
          }

          if (physEvents.crashEvents.length > 0) {
            const wallEv = physEvents.crashEvents[0];
            fx.spawnCrashBurstEffect(wallEv, S.camYaw);
            pokoAudio.playCrashImpact(wallEv.severity, wallEv.kind);
            S.cameraTrauma = Math.max(
              S.cameraTrauma,
              wallEv.severity === 'crash' ? 0.54 : 0.3,
            );
            S.hitFlashTimer = Math.max(
              S.hitFlashTimer,
              wallEv.severity === 'crash' ? 0.08 : 0.05,
            );
            if (wallEv.severity === 'crash') {
              S.hitstopTimer = Math.max(S.hitstopTimer, 0.035);
            }
            if (!physEvents.issuedTicket) {
              S.bannerEvent = {
                id: ++S.bannerSeq,
                label: physEvents.absorbedCurbWithShock
                  ? 'Shock-Absorber Saved Cargo!'
                  : wallEv.label,
                detail: physEvents.absorbedCurbWithShock
                  ? 'Step-Van Heavy Suspension'
                  : wallEv.kind === 'gate'
                    ? 'Wait for Bridge or Hit Ramp!'
                    : 'Bumper Rebound!',
                tone: wallEv.severity === 'crash' ? 'rose' : 'amber',
              };
              S.bannerTimer = 1.45;
              emitHudSnapshot();
            }
          } else if (physEvents.absorbedCurbWithShock) {
            pokoAudio.playCurbBump();
            S.bannerEvent = {
              id: ++S.bannerSeq,
              label: 'Shock-Absorber Saved Fragile!',
              detail: 'Step-Van Heavy Suspension',
              tone: 'amber',
            };
            S.bannerTimer = 1.4;
          } else if (physEvents.hitCurb) {
            pokoAudio.playCurbBump();
          }

          // Check Roadside Drive-Thru Espresso Boost Kiosks!
          const pickedCoffee = stepCoffeeKiosks(
            S.currentCity.coffeeKiosks,
            S.truckState,
            simDt,
          );
          if (pickedCoffee) {
            S.score += 65;
            S.timeRemainingSec = Math.min(
              S.currentCity.config.timeLimitSec + 22,
              S.timeRemainingSec + 3,
            );
            recordQuestEvent('pitstops_used', 1);
            pokoAudio.playCoffeePickup();
            S.bannerEvent = {
              id: ++S.bannerSeq,
              label: 'Espresso Boost!',
              detail: '+65 pts · +3s & Full Turbo',
              tone: 'emerald',
            };
            S.bannerTimer = 1.95;
            spawnParticleBurst(
              pickedCoffee.roadX,
              0.8,
              pickedCoffee.roadZ,
              14,
              [0x34d399, 0xfde68a, 0xffffff],
              1.0,
            );
            emitHudSnapshot();
          }

          // Check Wrench Mechanic Pit-Stop Garages!
          const servicedGarage = stepMechanicGarages(
            S.currentCity.mechanicGarages,
            S.truckState,
            simDt,
          );
          if (servicedGarage) {
            S.score += 55;
            recordQuestEvent('pitstops_used', 1);
            pokoAudio.playMechanicWrench();
            S.bannerEvent = {
              id: ++S.bannerSeq,
              label: 'Wrench Pit-Stop!',
              detail: '+1 Hull HP & Bumper Shield',
              tone: 'emerald',
            };
            S.bannerTimer = 1.95;
            spawnParticleBurst(
              servicedGarage.roadX,
              0.8,
              servicedGarage.roadZ,
              16,
              [0x38bdf8, 0xffdf24, 0xffffff],
              1.05,
            );
            emitHudSnapshot();
          }

          // Step Duckling Family Crossings + Polite Yield Bonus!
          const politeDuck = stepDuckCrossings(
            S.currentCity.duckCrossings,
            S.truckState,
            simDt,
          );
          if (politeDuck) {
            S.score += 95;
            awardRunCoins(30);
            pokoAudio.playDuckQuack();
            S.bannerEvent = {
              id: ++S.bannerSeq,
              label: 'Polite Duck Yield!',
              detail: '+95 pts · +30 Coins',
              tone: 'emerald',
            };
            S.bannerTimer = 1.85;
            emitHudSnapshot();
          }

          // Step Moving Porch Customers & Rival Courier ("Zoomy Blitz")
          stepMovingCustomers(S.currentCity.stops, S.visualClock);
          const rivalStatus = stepRivalCourier(
            S.currentCity.rivalCourier,
            S.truckState,
            simDt,
          );
          if (rivalStatus === 'player_claimed' && S.currentCity.rivalCourier) {
            S.score += 250;
            awardRunCoins(75);
            S.riderRushHourBonus += 8.0;
            S.lastEarningEvent = {
              id: ++S.earningSeq,
              label: '高峰抢单王补贴',
              amountYuan: 8.0,
              isReward: true,
            };
            S.earningEventTimer = 2.4;
            pokoAudio.playSpinReward();
            S.bannerEvent = {
              id: ++S.bannerSeq,
              label: 'Beat Zoomy Blitz!',
              detail: '+250 pts · +¥8.0补贴',
              tone: 'emerald',
            };
            S.bannerTimer = 2.15;
            spawnParticleBurst(
              S.currentCity.rivalCourier.bonusDropPos.x,
              0.9,
              S.currentCity.rivalCourier.bonusDropPos.z,
              22,
              [0xffdf24, 0xa855f7, 0xffffff],
              1.3,
            );
            emitHudSnapshot();
          }

          // Auto-drop check if player drove onto the golden delivery pad (respecting Large Crate brake check!)
          const postStop = getActiveStop(S.currentCity.stops);
          const postElig = checkDeliveryEligibility(
            S.truckState,
            postStop,
            S.currentCity.totalGridSize,
          );
          const demoKeepLastStopForFinale =
            S.demoState.active &&
            S.demoState.sceneId !== 'scene5_finale_orbit' &&
            S.currentCity.stops.filter((s) => !s.delivered).length <= 1;
          if (postElig.canAutoDrop && !demoKeepLastStopForFinale) {
            triggerParcelDelivery(false, postElig.canBullseyeToss);
          }

          // Step obstacle-aware sidewalk & plaza pedestrians
          stepPedestriansPhysics(
            S.currentCity.pedestrians,
            S.currentCity,
            S.truckState,
            simDt,
          );

          // Step traffic & bridge hazards + Solid 3D Vehicle Separation, Crash Events & Ambient Car Honks!
          const hazEvents = stepHazardsAndCollisions(
            S.currentCity.hazards,
            S.truckState,
            simDt,
            S.currentCity.trafficSignals,
            S.currentCity,
          );
          for (const wh of hazEvents.startedWindups) {
            pokoAudio.playWindupTelegraph(wh.kind === HazardKind.BridgeGate);
          }
          for (const hev of hazEvents.honkEvents) {
            const distH = Math.hypot(hev.x - S.truckState.x, hev.z - S.truckState.z);
            if (distH < 34) {
              const volScale = Math.max(0.22, 1 - distH / 36);
              pokoAudio.playAmbientCarHorn(hev.isBus, volScale);
            }
          }

          let playerCrashEv: CrashEvent | null = null;
          for (const cev of hazEvents.crashEvents) {
            if (cev.involvesPlayer) {
              playerCrashEv = cev;
              fx.spawnCrashBurstEffect(cev, S.camYaw);
            } else if (
              Math.hypot(cev.x - S.truckState.x, cev.z - S.truckState.z) < 28
            ) {
              fx.spawnCrashBurstEffect(cev, S.camYaw);
              if (Math.hypot(cev.x - S.truckState.x, cev.z - S.truckState.z) < 22) {
                pokoAudio.playAiFenderBender();
              }
            }
          }

          if (hazEvents.shieldAbsorbed) {
            pokoAudio.playCrashImpact('bump', 'vehicle');
            pokoAudio.playMechanicWrench();
            S.hitFlashTimer = 0.06;
            S.cameraTrauma = Math.max(S.cameraTrauma, 0.38);
            S.bannerEvent = {
              id: ++S.bannerSeq,
              label: 'Bumper Shield Saved You!',
              detail: 'Combo & Hull Preserved',
              tone: 'amber',
            };
            S.bannerTimer = 1.75;
            spawnParticleBurst(
              S.truckState.x,
              0.7,
              S.truckState.z,
              16,
              [0x38bdf8, 0xffffff, 0xfef08a],
              1.1,
            );
            emitHudSnapshot();
          } else if (hazEvents.playerHitBy) {
            pokoAudio.playCrashImpact('crash', 'vehicle');
            pokoAudio.setFeverMode(false);
            S.hitstopTimer = 0.055; // Crisp 55ms heavy impact hitstop!
            S.hitFlashTimer = 0.095;
            S.cameraTrauma = Math.min(1.0, S.cameraTrauma + 0.72);
            S.combo = 0;
            S.comboTimer = 0;
            S.riderSpillDeduction += 4.0;
            S.riderReviewScore = Math.max(3.0, Number((S.riderReviewScore - 0.1).toFixed(2)));
            S.lastEarningEvent = {
              id: ++S.earningSeq,
              label: '碰撞洒餐赔付',
              amountYuan: -4.0,
              isReward: false,
            };
            S.earningEventTimer = 2.2;
            S.bannerEvent = {
              id: ++S.bannerSeq,
              label: playerCrashEv?.label ?? 'Traffic Crash!',
              detail: `${S.truckState.health}/${S.truckState.maxHealth} · -¥4.0赔付`,
              tone: 'rose',
            };
            S.bannerTimer = 1.8;
            emitHudSnapshot();
          } else if (playerCrashEv) {
            pokoAudio.playCrashImpact(playerCrashEv.severity, playerCrashEv.kind);
            S.hitFlashTimer = 0.07;
            S.cameraTrauma = Math.max(S.cameraTrauma, 0.44);
            if (playerCrashEv.kind === 'rival') {
              S.hitstopTimer = Math.max(S.hitstopTimer, 0.038);
            }
            S.bannerEvent = {
              id: ++S.bannerSeq,
              label: playerCrashEv.label,
              detail:
                playerCrashEv.kind === 'rival'
                  ? 'Trading Paint with Rival!'
                  : 'Solid Bumper Bounce!',
              tone: 'amber',
            };
            S.bannerTimer = 1.45;
            emitHudSnapshot();
          } else if (hazEvents.nearMissCount > 0) {
            const pts = 45 * hazEvents.nearMissCount;
            S.score += pts;
            recordQuestEvent('near_misses', hazEvents.nearMissCount);
            pokoAudio.playNearMissWhoosh();
            S.windStreakTimer = Math.max(S.windStreakTimer, 0.56);
            if (!S.bannerEvent || S.bannerTimer < 0.6) {
              S.bannerEvent = {
                id: ++S.bannerSeq,
                label: 'Slipstream Near-Miss!',
                detail: `+${pts} pts · +Turbo Charge`,
                tone: 'emerald',
              };
              S.bannerTimer = 1.25;
              emitHudSnapshot();
            }
          }

          // Express Fever rainbow exhaust sparkles + Sunshower raindrops!
          if (S.combo >= FEVER_COMBO_THRESHOLD && S.comboTimer > 0 && S.truckState.speed > 1.5) {
            S.feverTrailAccum += simDt;
            if (S.feverTrailAccum > 0.09) {
              S.feverTrailAccum = 0;
              spawnParticleBurst(
                S.truckState.x - Math.sin(S.truckState.yaw) * 0.9,
                0.35 + S.truckState.y,
                S.truckState.z - Math.cos(S.truckState.yaw) * 0.9,
                2,
                [0xffdf24, 0xff70a6, 0x38bdf8, 0x9ef01a],
                0.45,
              );
            }
          }
          if (S.currentCity.config.hasSunshower) {
            S.sunshowerAccum += simDt;
            if (S.sunshowerAccum > 0.14) {
              S.sunshowerAccum = 0;
              spawnParticleBurst(
                S.truckState.x + (Math.random() - 0.5) * 14,
                3.2,
                S.truckState.z + (Math.random() - 0.5) * 14,
                2,
                [0xbae6fd, 0x7dd3fc],
                0.35,
              );
            }
          }

          // Check Victory / Defeat Outcome
          const outcome = evaluateRunStatus(
            S.currentCity.stops,
            S.timeRemainingSec,
            S.truckState.health,
          );
          if (outcome !== OutcomeKind.None) {
            S.pendingOutcome = outcome;
            S.finishDelayTimer = outcome === OutcomeKind.Victory ? 1.55 : 0.52;
            S.victoryOrbitAngle = 0;
            S.victoryConfettiAccum = 0;
            pokoAudio.setFeverMode(false);
            if (outcome === OutcomeKind.Victory) {
              // Time-left mastery bonus + Stage Clear Confetti Finale!
              S.score += Math.round(S.timeRemainingSec * 15);
              pokoAudio.playStageClear();
              spawnParticleBurst(
                S.truckState.x,
                1.4,
                S.truckState.z,
                28,
                [0xffe524, 0xff70a6, 0x38bdf8, 0x9ef01a, 0xa855f7],
                1.45,
              );
              S.bannerEvent = {
                id: ++S.bannerSeq,
                label: 'Stage Complete!',
                detail: 'All Parcels Delivered!',
                tone: 'emerald',
              };
              S.bannerTimer = 1.6;
            } else {
              pokoAudio.playGameOver();
            }
            emitHudSnapshot();
          }
        } else if (S.finishDelayTimer >= 0) {
          S.finishDelayTimer -= dt;
          if (S.pendingOutcome === OutcomeKind.Victory) {
            // Smooth celebratory coast + Orbiting Confetti Finale!
            S.truckState.speed *= Math.exp(-4.5 * dt);
            S.victoryOrbitAngle += dt * 1.45;
            S.victoryConfettiAccum += dt;
            if (S.victoryConfettiAccum > 0.28) {
              S.victoryConfettiAccum = 0;
              spawnParticleBurst(
                S.truckState.x + (Math.random() - 0.5) * 2.4,
                1.5,
                S.truckState.z + (Math.random() - 0.5) * 2.4,
                16,
                [0xffe524, 0xff70a6, 0x38bdf8, 0x9ef01a, 0xffffff],
                1.25,
              );
            }
          }
          if (S.finishDelayTimer <= 0) {
            if (S.demoState.active) {
              // Hold celebratory confetti & Victory Orbit inside the demo until 45s completes!
              S.finishDelayTimer = 0.25;
            } else {
              S.finishDelayTimer = -1;
              clearAllInputs();
              pokoAudio.setFeverMode(false);
              const deliveredCount = S.currentCity.stops.filter(
                (s) => s.delivered,
              ).length;
              const finalScore = Math.round(S.score);
              const ceilLeft = Math.max(0, Math.ceil(S.timeRemainingSec));
              const runRewards = computeRunRewards(
                S.pendingOutcome,
                finalScore,
                deliveredCount,
                S.truckState.ticketsCount,
                ceilLeft,
              );
              if (S.pendingOutcome === OutcomeKind.OutOfTime) {
                S.riderLateDeduction += 10.0;
              }
              const finalTips = Number(
                (S.riderOnTimeBonus + S.riderHotMealTip + S.riderBullseyeTip + S.riderRushHourBonus).toFixed(1),
              );
              const finalPenalties = Number(
                (S.riderSpillDeduction + S.riderTrafficFines + S.riderLateDeduction).toFixed(1),
              );
              const finalNetYuan = Number(
                (S.riderBaseIncome + finalTips - finalPenalties).toFixed(1),
              );
              const praiseRate = Math.max(
                60,
                Math.min(100, Math.round((S.riderReviewScore / 5.0) * 100)),
              );
              const riderReceipt: RiderShiftReceipt = {
                totalOrders: deliveredCount,
                baseDeliveryFee: Number(S.riderBaseIncome.toFixed(1)),
                onTimeBonus: Number(S.riderOnTimeBonus.toFixed(1)),
                hotMealTip: Number(S.riderHotMealTip.toFixed(1)),
                bullseyeTip: Number(S.riderBullseyeTip.toFixed(1)),
                rushHourBonus: Number(S.riderRushHourBonus.toFixed(1)),
                spillDeduction: Number(S.riderSpillDeduction.toFixed(1)),
                trafficFines: Number(S.riderTrafficFines.toFixed(1)),
                lateDeduction: Number(S.riderLateDeduction.toFixed(1)),
                netEarningsYuan: finalNetYuan,
                praiseRate,
              };
              onRunFinishedRef.current({
                level: S.currentCity.config.level,
                districtName: S.currentCity.config.districtName,
                outcome: S.pendingOutcome,
                score: finalScore,
                bestScore: Math.max(bestScoreRef.current, finalScore),
                coinsEarned: runRewards.coinsEarned,
                starsEarned: runRewards.starsEarned,
                earnedSpinToken: runRewards.earnedSpinToken,
                deliveredCount,
                totalStops: S.currentCity.stops.length,
                bullseyeCount: S.bullseyeCount,
                timeRemainingSec: ceilLeft,
                elapsedSec: Math.round(S.elapsedSec),
                maxCombo: S.maxCombo,
                healthRemaining: S.truckState.health,
                ticketsCount: S.truckState.ticketsCount,
                customCity: S.currentCity.config.customCity,
                riderReceipt,
              });
            }
          }
        }

        updateCameraFraming(dt, S, cameraFramingDeps);

        // Keep minimap snapshot smooth every frame while throttling React HUD state to ~8Hz
        syncMinimapSnapshot();
        if (now - S.lastHudEmitTime > 125) {
          S.lastHudEmitTime = now;
          emitHudSnapshot();
        }
}
