import type * as THREE from 'three';
import { DRIFT_TIER1_SEC, DRIFT_TIER2_SEC } from '../../config/balance';
import { gridToWorld } from '../../game/proceduralCity';
import type { TrafficHazard } from '../../game/types';
import { getViewMode } from '../../game/controls';
import { ParcelKind } from '../../game/types';
import { getActiveStop, stepParcelStackWobble } from '../../game/rules';
import { GamePhase, HazardKind, HazardPhase, SignalAxisState } from '../../game/types';
import type { ToyTruckRig, WindStreakRig } from '../../game/meshes';
import type { EffectsSystem } from './effects';
import type { RuntimeState } from './runtimeState';
import {
  CHASE_BACK_DIST,
  CHASE_BASE_FOV,
  CHASE_LOOK_AHEAD,
  CHASE_UP_HEIGHT,
  _color,
  _euler,
  _pos,
  _quat,
  _scale,
  wrapAngleRad,
} from './canvasMath';

// Everything the visual layer needs from the runtime that is not part of RuntimeState.
export interface VisualDeps {
  fx: EffectsSystem;
  truckRig: ToyTruckRig;
  windStreakRig: WindStreakRig;
  refreshForwardRoadPath: () => void;
  updateHazardWarnings: (hazards: readonly TrafficHazard[], clock: number) => void;
}

// Section 7 of the frame: push simulation state into the three.js scene graph.
export function updateVisuals(
  dt: number,
  S: RuntimeState,
  deps: VisualDeps,
  currentPhase: GamePhase,
): void {
  const { fx, truckRig, windStreakRig, refreshForwardRoadPath } = deps;
      // 7. Update Visual Meshes (Truck Gait/Roll/Pitch/Steer/Jump/Shield, Citizens, Pedestrians, Hazards, Particles)
      truckRig.root.position.set(
        S.truckState.x,
        0.24 + S.truckState.y,
        S.truckState.z,
      );
      truckRig.root.rotation.y = S.truckState.yaw;
      // Keep contact shadow anchored flush to the road surface even while airborne off a Canal Ramp!
      truckRig.shadowMesh.position.y = 0.025 - S.truckState.y;
      const airShadowScale = Math.max(0.62, 1 - S.truckState.y * 0.22);
      truckRig.shadowMesh.scale.set(airShadowScale, airShadowScale, 1);

      truckRig.shieldRing.visible = S.truckState.hasBumperShield;
      if (S.truckState.hasBumperShield) {
        truckRig.shieldRing.rotation.z = S.visualClock * 1.8;
      }
      truckRig.topperPivot.rotation.y = Math.sin(S.visualClock * 2.4) * 0.16;

      // Blink gently during invulnerability frames
      truckRig.root.visible =
        S.truckState.invulnTimer <= 0 ||
        Math.floor(S.truckState.invulnTimer * 16) % 2 === 0;

      // Distance-synced suspension bounce + body roll/pitch + squash-and-stretch + front wheel steering!
      const gaitBob =
        S.truckState.y > 0.05
          ? 0
          : Math.abs(Math.sin(S.truckState.distanceTraveled * 2.8)) *
            Math.min(1, S.truckState.speed / 5) *
            0.055;
      const invScaleXZ = 1 / Math.sqrt(S.truckState.squashY);
      truckRig.bodyTiltGroup.position.y = gaitBob;
      truckRig.bodyTiltGroup.rotation.z = S.truckState.rollAngle;
      truckRig.bodyTiltGroup.rotation.x =
        S.truckState.pitchAngle - Math.min(0.22, S.truckState.vy * 0.022);
      truckRig.bodyTiltGroup.scale.set(
        invScaleXZ,
        S.truckState.squashY,
        invScaleXZ,
      );
      for (const sg of truckRig.frontWheelSteerGroups) {
        sg.rotation.y = S.truckState.steerAngle;
      }
      for (const w of truckRig.wheels) {
        w.rotation.x = S.truckState.distanceTraveled * 2.4;
      }
      // In cockpit view the camera sits inside the van, so drop the body but keep
      // the shadow blob readable from the low eye-line.
      truckRig.root.traverse(() => {});
      truckRig.bodyTiltGroup.visible = getViewMode() !== 'cockpit';
      truckRig.shadowMesh.visible = getViewMode() !== 'cockpit';
      // Brake lights glow crimson; reversing keeps them hot plus a wider rig.
      truckRig.taillightMat.emissiveIntensity = S.truckState.isReversing
        ? 2.45
        : S.truckState.isBraking
          ? 1.9
          : 0.45;

      // Drift Tire Smoke + Tier 1 Cyan / Tier 2 Gold Mini-Turbo Sparks!
      if (S.truckState.isDrifting && currentPhase === GamePhase.Playing) {
        S.driftSparkAccum += dt;
        if (S.driftSparkAccum >= 0.065) {
          S.driftSparkAccum = 0;
          const rearX = S.truckState.x - Math.sin(S.truckState.yaw) * 0.72;
          const rearZ = S.truckState.z - Math.cos(S.truckState.yaw) * 0.72;
          const tier =
            S.truckState.driftChargeAccum >= DRIFT_TIER2_SEC
              ? 2
              : S.truckState.driftChargeAccum >= DRIFT_TIER1_SEC
                ? 1
                : 0;
          const sparkPalette =
            tier === 2
              ? [0xffe524, 0xf97316, 0xffffff]
              : tier === 1
                ? [0x38bdf8, 0x70e4ff, 0xe0f2fe]
                : [0xe2e8f0, 0xcbd5e1, 0xf8fafc];
          fx.spawnParticleBurst(rearX, 0.34, rearZ, tier > 0 ? 4 : 2, sparkPalette, tier > 0 ? 0.65 : 0.38);
        }
      } else {
        S.driftSparkAccum = 0;
      }

      // Wobbly Roof-Rack Parcel Stack Spring-Damper Sway!
      stepParcelStackWobble(S.parcelWobble, S.truckState, dt);
      for (let pi = 0; pi < truckRig.parcelBoxes.length; pi++) {
        const box = truckRig.parcelBoxes[pi];
        if (!box.visible) continue;
        const layer = (box.userData.layer as number) ?? Math.floor(pi / 2);
        const bx = (box.userData.baseX as number) ?? 0;
        const by = (box.userData.baseY as number) ?? 1.13;
        const bz = (box.userData.baseZ as number) ?? -0.32;
        const brotY = (box.userData.baseRotY as number) ?? 0;
        box.position.x = bx - Math.sin(S.parcelWobble.roll) * layer * 0.14;
        box.position.y = by + S.parcelWobble.bounceY * (1 + layer * 0.35);
        box.position.z = bz + Math.sin(S.parcelWobble.pitch) * layer * 0.12;
        box.rotation.z = S.parcelWobble.roll * (0.45 + layer * 0.25);
        box.rotation.x = S.parcelWobble.pitch * (0.42 + layer * 0.22);
        box.rotation.y = brotY + S.parcelWobble.roll * 0.12 * (pi % 2 === 0 ? 1 : -1);
      }

      // 3D Near-Miss & Rocket-Start Slipstream Wind-Streak Ribbons!
      windStreakRig.root.visible = S.windStreakTimer > 0;
      if (S.windStreakTimer > 0) {
        const wsPulse = Math.min(1, S.windStreakTimer / 0.28);
        const streakSlide = ((S.visualClock * 18) % 1) * 0.75 - 0.35;
        windStreakRig.leftRibbon.position.z = -streakSlide;
        windStreakRig.rightRibbon.position.z = -streakSlide * 0.85;
        windStreakRig.leftRibbon.scale.set(1, 1, 0.65 + wsPulse * 0.65);
        windStreakRig.rightRibbon.scale.set(1, 1, 0.65 + wsPulse * 0.65);
      }

      // Overview Sky-Beacons scale tall during 3-2-1 Bird's-Eye Swoop and tuck down smoothly when driving!
      const overviewVisibilityFactor = Math.max(0, 1 - S.countdownState.swoopAlpha * 1.05);
      for (const rb of S.rampBeaconGroups) {
        rb.visible = overviewVisibilityFactor > 0.04;
        if (rb.visible) {
          rb.scale.set(
            0.78,
            0.25 + overviewVisibilityFactor * 0.95,
            0.78,
          );
        }
      }

      // Spin & Bob Cultural Landmark Discovery Beacons until discovered!
      for (const lb of S.landmarkBeacons) {
        const found = S.discoveredLandmarkIds.has(lb.id);
        lb.mesh.visible = !found;
        if (!found) {
          lb.mesh.rotation.y = S.visualClock * 1.9;
          lb.mesh.position.y = 4.9 + Math.sin(S.visualClock * 3.1) * 0.22;
        }
      }

      // Update Articulated Waiting Customers (plus Excitement Charm, Overview Beam & Bullseye Ring!)
      const activeStop = getActiveStop(S.currentCity.stops);
      S.citizenRigs.forEach((cr, idx) => {
        const stop = S.currentCity.stops[idx];
        if (!stop) return;
        if (
          stop.liveCitizenX !== undefined &&
          stop.liveCitizenZ !== undefined
        ) {
          cr.citizenGroup.position.set(
            stop.liveCitizenX,
            0.42,
            stop.liveCitizenZ,
          );
        }
        const isNext = activeStop?.id === stop.id;
        if (stop.delivered) {
          const hop = Math.abs(Math.sin(S.visualClock * 6 + idx)) * 0.14;
          cr.person.bodyBounce.position.y = hop;
          cr.person.rightArm.rotation.x = -2.5;
          cr.person.leftArm.rotation.x = -2.5;
          cr.person.rightArm.rotation.z = -0.3 + Math.sin(S.visualClock * 11) * 0.25;
          cr.person.leftArm.rotation.z = 0.3 - Math.sin(S.visualClock * 11) * 0.25;
          cr.excitementBadge.visible = true;
          cr.excitementBadge.position.y = 1.62 + hop * 0.9;
          cr.excitementBadge.rotation.y = S.visualClock * 4.6;
          cr.overviewBeam.visible = false;
        } else if (isNext) {
          cr.person.bodyBounce.position.y =
            Math.abs(Math.sin(S.visualClock * 4.8)) * 0.08;
          cr.person.rightArm.rotation.x = -2.55;
          cr.person.rightArm.rotation.z =
            -0.25 + Math.sin(S.visualClock * 10.5) * 0.36;
          cr.person.headGroup.rotation.y = Math.sin(S.visualClock * 3.2) * 0.18;
          cr.pinSprite.position.y = 1.96 + Math.sin(S.visualClock * 4.5) * 0.12;
          cr.pinSprite.scale.setScalar(
            1.04 + overviewVisibilityFactor * 0.55,
          );
          cr.excitementBadge.visible = true;
          cr.excitementBadge.position.y =
            1.48 + Math.sin(S.visualClock * 5.8) * 0.09;
          cr.excitementBadge.rotation.y = S.visualClock * 3.4;
          const pulseScale = 1 + Math.sin(S.visualClock * 5.5) * 0.1;
          cr.outerRing.scale.set(pulseScale, pulseScale, 1);
          const bullScale = 1 + Math.cos(S.visualClock * 7.2) * 0.12;
          cr.bullseyeRing.scale.set(bullScale, bullScale, 1);
          cr.padGroup.visible = true;
          cr.overviewBeam.visible = true;
          cr.overviewBeam.scale.set(
            0.9 + overviewVisibilityFactor * 0.35,
            0.22 + overviewVisibilityFactor * 1.15,
            0.9 + overviewVisibilityFactor * 0.35,
          );
        } else {
          cr.person.bodyBounce.position.y =
            Math.abs(Math.sin(S.visualClock * 2.0 + idx)) * 0.02;
          cr.person.rightArm.rotation.x = 0;
          cr.person.rightArm.rotation.z = -0.1;
          cr.person.headGroup.rotation.y =
            Math.sin(S.visualClock * 1.5 + idx) * 0.24;
          cr.pinSprite.position.y = 1.84 + Math.sin(S.visualClock * 2.5 + idx) * 0.05;
          cr.pinSprite.scale.setScalar(
            0.78 + overviewVisibilityFactor * 0.38,
          );
          cr.excitementBadge.visible = false;
          cr.padGroup.visible = false;
          cr.overviewBeam.visible = false;
        }
      });

      // Live 3D Parcel Toss Trajectory Arc Preview when approaching active customer!
      if (activeStop && currentPhase === GamePhase.Playing && !S.countdownState.isFrozen) {
        const cw = gridToWorld(activeStop.citizenCoord, S.currentCity.totalGridSize);
        const tx = activeStop.liveCitizenX ?? cw.x;
        const tz = activeStop.liveCitizenZ ?? cw.z;
        const distToCustomer = Math.hypot(S.truckState.x - tx, S.truckState.z - tz);
        if (distToCustomer <= 7.8) {
          const rw = gridToWorld(activeStop.roadCoord, S.currentCity.totalGridSize);
          const distToRing = Math.hypot(S.truckState.x - rw.x, S.truckState.z - rw.z);
          const needsStop =
            activeStop.parcelKind === ParcelKind.Large && S.truckState.speed > 1.8;
          const arcColor = needsStop
            ? 0xf97316
            : distToRing < 0.72
              ? 0xfacc15
              : distToRing <= 2.35
                ? 0x22c55e
                : 0x38bdf8;
          fx.updateTossArc(
            true,
            S.truckState.x,
            1.28 + S.truckState.y,
            S.truckState.z,
            tx,
            0.68,
            tz,
            arcColor,
            S.visualClock,
          );
        } else {
          fx.updateTossArc(false, 0, 0, 0, 0, 0, 0, 0xffffff, 0);
        }
      } else {
        fx.updateTossArc(false, 0, 0, 0, 0, 0, 0, 0xffffff, 0);
      }

      // Animate Obstacle-Free Sidewalk & Plaza Pedestrians (distance-synced stride, zero skating!)
      for (const item of S.pedestrianRigs) {
        const p = item.data;
        item.rig.root.position.set(p.x, 0.42, p.z);
        item.rig.root.rotation.y = p.yaw;

        if (p.waveTimer > 0) {
          item.rig.leftLeg.rotation.x = 0;
          item.rig.rightLeg.rotation.x = 0;
          item.rig.leftArm.rotation.x = 0;
          item.rig.rightArm.rotation.x = -2.45;
          item.rig.rightArm.rotation.z =
            -0.25 + Math.sin(S.visualClock * 11.5) * 0.32;
          item.rig.bodyBounce.position.y =
            Math.abs(Math.sin(S.visualClock * 5.2)) * 0.04;
        } else {
          const curSpd = Math.hypot(p.vx, p.vz);
          const speedRatio = Math.min(
            1,
            curSpd / Math.max(0.5, p.walkSpeed),
          );
          const stride = Math.sin(p.strideDistance * 3.8) * speedRatio;
          item.rig.leftLeg.rotation.x = stride * 0.54;
          item.rig.rightLeg.rotation.x = -stride * 0.54;
          item.rig.leftArm.rotation.x = -stride * 0.45;
          item.rig.rightArm.rotation.x = stride * 0.45;
          item.rig.rightArm.rotation.z = -0.1;
          item.rig.bodyBounce.position.y = Math.abs(stride) * 0.036;
        }
      }

      // Animate Canal Boats & Sailboats gently cruising and bobbing on the water!
      for (const bItem of S.boatRigs) {
        const b = bItem.data;
        const dx = b.patrolEnd.x - b.patrolStart.x;
        const dz = b.patrolEnd.z - b.patrolStart.z;
        const dist = Math.max(0.5, Math.hypot(dx, dz));
        const omega = (b.speed / dist) * 0.9;
        const phase = S.visualClock * omega + b.phaseOffset;
        const u = 0.5 - 0.5 * Math.cos(phase);
        const dirSign = Math.sin(phase) >= 0 ? 1 : -1;

        const bobY = 0.055 + Math.sin(S.visualClock * 2.4 + b.phaseOffset) * 0.025;
        bItem.mesh.position.set(
          b.patrolStart.x + dx * u,
          bobY,
          b.patrolStart.z + dz * u,
        );
        bItem.mesh.rotation.y = Math.atan2(dx * dirSign, dz * dirSign);
        bItem.mesh.rotation.z = Math.sin(S.visualClock * 1.9 + b.phaseOffset) * 0.04;
      }

      // Animate Flocking 3D Songbirds & Harbor Seagulls!
      for (const bird of S.birdRigs) {
        const angle = S.visualClock * bird.speed + bird.phase;
        const bx = bird.centerX + Math.cos(angle) * bird.orbitRadiusX;
        const bz = bird.centerZ + Math.sin(angle) * bird.orbitRadiusZ;
        const vx = -Math.sin(angle) * bird.orbitRadiusX * bird.speed;
        const vz = Math.cos(angle) * bird.orbitRadiusZ * bird.speed;
        const by = bird.baseY + Math.sin(angle * 2.1) * 0.28;

        bird.rig.root.position.set(bx, by, bz);
        bird.rig.root.rotation.y = Math.atan2(vx, vz);
        bird.rig.root.rotation.z = -0.26; // Graceful inward bank along curved flight path!
        bird.rig.root.rotation.x = Math.cos(angle * 2.1) * 0.08;

        // Naturalistic flap-flap-glide cadence!
        const glideCycle = Math.sin(S.visualClock * 1.7 + bird.phase);
        const flapAmp = glideCycle > 0.55 ? 0.14 : 0.66;
        const flap = Math.sin(S.visualClock * bird.flapSpeed + bird.phase) * flapAmp;
        bird.rig.leftWingPivot.rotation.z = flap;
        bird.rig.rightWingPivot.rotation.z = -flap;
      }

      // Update Traffic & Gate Hazard Visuals + Crash Wobble, Hit-Flash & 3D Comic Honk Rings!
      for (const hr of S.hazardRigs) {
        const h = hr.hazard;
        hr.root.position.set(h.x, 0.24, h.z);
        hr.root.rotation.y = h.yaw;

        if (hr.honkRingGroup) {
          const hvt = h.honkVisualTimer ?? 0;
          hr.honkRingGroup.visible = hvt > 0;
          if (hvt > 0) {
            const prog = 1 - Math.min(1, hvt / 0.72);
            const popScale = 0.55 + Math.sin(prog * Math.PI) * 0.75;
            hr.honkRingGroup.scale.setScalar(popScale);
            hr.honkRingGroup.rotation.y = S.camYaw - h.yaw;
          }
        }

        if (hr.bodyTiltGroup && hr.hitFlashMat) {
          const bt = h.bumpTimer ?? 0;
          if (bt > 0) {
            hr.bodyTiltGroup.rotation.z = Math.sin(bt * 38) * bt * 0.44;
            hr.bodyTiltGroup.rotation.x = Math.cos(bt * 31) * bt * 0.3;
            const sy = Math.max(0.75, 1 + Math.sin(bt * 26) * bt * 0.32);
            const sxz = 1 / Math.sqrt(sy);
            hr.bodyTiltGroup.scale.set(sxz, sy, sxz);
            hr.hitFlashMat.emissive.setHex(0xfff3b0);
            hr.hitFlashMat.emissiveIntensity = Math.min(0.85, bt * 1.9);
          } else {
            hr.bodyTiltGroup.rotation.set(0, 0, 0);
            hr.bodyTiltGroup.scale.set(1, 1, 1);
            hr.hitFlashMat.emissiveIntensity = 0;
          }
        }

        if (h.kind === HazardKind.ScooterDash) {
          const isWinding = h.phase === HazardPhase.Windup;
          if (hr.warningBeacon) {
            hr.warningBeacon.visible = isWinding;
            if (isWinding) {
              const s = 1 + Math.sin(S.visualClock * 28) * 0.28;
              hr.warningBeacon.scale.setScalar(s);
            }
          }
          if (hr.aimStrip) {
            hr.aimStrip.visible = isWinding;
          }
        } else if (h.kind === HazardKind.BridgeGate && hr.gateArm) {
          const gateBumpWobble =
            (h.bumpTimer ?? 0) > 0
              ? Math.sin((h.bumpTimer ?? 0) * 42) * (h.bumpTimer ?? 0) * 0.35
              : 0;
          const targetRot =
            h.phase === HazardPhase.Active
              ? gateBumpWobble
              : h.phase === HazardPhase.Windup
                ? Math.PI * 0.22 + Math.sin(S.visualClock * 22) * 0.08
                : Math.PI * 0.44;
          hr.gateArm.rotation.z +=
            (targetRot - hr.gateArm.rotation.z) * (1 - Math.exp(-12 * dt));
          if (hr.warningBeacon) {
            const mat = hr.warningBeacon.material as THREE.MeshStandardMaterial;
            mat.emissiveIntensity =
              h.phase === HazardPhase.Windup
                ? 0.6 + Math.abs(Math.sin(S.visualClock * 20)) * 1.4
                : h.phase === HazardPhase.Active
                  ? 1.0
                  : 0.15;
          }
        }
      }

      const greenWaveOverride = S.truckState.greenWaveTimer > 0;
      for (const sr of S.signalRigs) {
        const st = sr.signal.state;
        const ewG = greenWaveOverride || st === SignalAxisState.EWGreen;
        const ewY = !greenWaveOverride && st === SignalAxisState.EWYellow;
        const ewR = !ewG && !ewY;
        const nsG = greenWaveOverride || st === SignalAxisState.NSGreen;
        const nsY = !greenWaveOverride && st === SignalAxisState.NSYellow;
        const nsR = !nsG && !nsY;

        sr.ewGreenMat.emissiveIntensity = ewG ? 2.1 : 0.04;
        sr.ewYellowMat.emissiveIntensity = ewY ? 2.1 : 0.04;
        sr.ewRedMat.emissiveIntensity = ewR ? 2.1 : 0.04;

        sr.nsGreenMat.emissiveIntensity = nsG ? 2.1 : 0.04;
        sr.nsYellowMat.emissiveIntensity = nsY ? 2.1 : 0.04;
        sr.nsRedMat.emissiveIntensity = nsR ? 2.1 : 0.04;
      }

      for (const kr of S.kioskRigs) {
        const ready = kr.kiosk.cooldown <= 0;
        kr.roadRingGroup.visible = ready;
        kr.cupGroup.rotation.y = S.visualClock * (ready ? 1.65 : 0.45);
        kr.cupGroup.position.y =
          0.94 + (ready ? Math.sin(S.visualClock * 3.5) * 0.05 : 0);
      }

      for (const gr of S.garageRigs) {
        const ready = gr.garage.cooldown <= 0;
        gr.roadRingGroup.visible = ready;
        gr.wrenchGroup.rotation.y = S.visualClock * (ready ? 1.8 : 0.5);
        gr.wrenchGroup.position.y =
          1.28 + (ready ? Math.sin(S.visualClock * 3.8) * 0.05 : 0);
      }

      for (const dr of S.duckRigs) {
        dr.mesh.position.set(dr.data.x, 0.25, dr.data.z);
        dr.mesh.rotation.y = dr.data.yaw;
        dr.mesh.rotation.z = Math.sin(S.visualClock * 11 + dr.data.phase) * 0.09;
      }

      for (const gwr of S.greenWaveRigs) {
        const ready = gwr.data.cooldown <= 0;
        gwr.mesh.visible = ready;
        if (ready) {
          gwr.mesh.position.y = 0.62 + Math.sin(S.visualClock * 3.6) * 0.08;
          gwr.mesh.rotation.y = S.visualClock * 2.1;
        }
      }

      if (S.rivalRig && S.currentCity.rivalCourier) {
        const rv = S.currentCity.rivalCourier;
        S.rivalRig.vanGroup.position.set(rv.x, 0.24, rv.z);
        S.rivalRig.vanGroup.rotation.y = rv.yaw;
        const rbt = rv.bumpTimer ?? 0;
        if (rbt > 0) {
          S.rivalRig.bodyTiltGroup.rotation.z = Math.sin(rbt * 38) * rbt * 0.44;
          S.rivalRig.bodyTiltGroup.rotation.x = Math.cos(rbt * 31) * rbt * 0.3;
          const sy = Math.max(0.75, 1 + Math.sin(rbt * 26) * rbt * 0.32);
          const sxz = 1 / Math.sqrt(sy);
          S.rivalRig.bodyTiltGroup.scale.set(sxz, sy, sxz);
          S.rivalRig.hitFlashMat.emissive.setHex(0xfff3b0);
          S.rivalRig.hitFlashMat.emissiveIntensity = Math.min(0.85, rbt * 1.9);
        } else {
          S.rivalRig.bodyTiltGroup.rotation.set(0, 0, 0);
          S.rivalRig.bodyTiltGroup.scale.set(1, 1, 1);
          S.rivalRig.hitFlashMat.emissiveIntensity = 0;
        }
        S.rivalRig.bonusDropGroup.visible = !rv.bonusClaimed && !rv.rivalWonBonus;
        if (S.rivalRig.bonusDropGroup.visible) {
          S.rivalRig.bonusDropGroup.rotation.y = S.visualClock * 2.2;
          S.rivalRig.bonusDropGroup.position.y =
            0.65 + Math.sin(S.visualClock * 3.5) * 0.08;
          S.rivalRig.bonusOverviewBeam.visible = overviewVisibilityFactor > 0.03;
          if (S.rivalRig.bonusOverviewBeam.visible) {
            S.rivalRig.bonusOverviewBeam.scale.set(
              0.88,
              0.25 + overviewVisibilityFactor * 1.05,
              0.88,
            );
          }
        }
      }

      for (const br of S.balloonRigs) {
        const b = br.data;
        const t = S.visualClock * b.speed + b.phaseOffset;
        br.mesh.position.set(
          b.baseX + Math.cos(t) * b.orbitRadius,
          b.baseY + Math.sin(t * 1.8) * 0.42,
          b.baseZ + Math.sin(t) * (b.orbitRadius * 0.65),
        );
        br.mesh.rotation.y = t * 0.35;
      }

      // Update Forward-Only Route Breadcrumb Chevrons along live road path to Active Stop!
      if (activeStop && currentPhase === GamePhase.Playing) {
        if (S.visualClock - S.lastPathCalcTime > 0.22) {
          S.lastPathCalcTime = S.visualClock;
          refreshForwardRoadPath();
        }
      } else {
        S.cachedRoadPath = [];
      }

      fx.updateBreadcrumbs(S.cachedRoadPath, S.visualClock);

      deps.updateHazardWarnings(S.currentCity.hazards, S.visualClock);

      // Advance every pooled visual effect (parcels, tip coins, crash bursts, particles)
      fx.setCoinTarget(S.truckState.x, 1.38 + S.truckState.y, S.truckState.z);
      fx.update(dt, S.camYaw);
}
