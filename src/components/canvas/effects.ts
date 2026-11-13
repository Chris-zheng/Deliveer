import * as THREE from 'three';
import { POOLS } from '../../config/balance';
import {
  createCrashBurstMesh,
  createMiniParcelMesh,
  createSpinningCoinMesh,
} from '../../game/meshes';
import type { CrashBurstRig } from '../../game/meshes';
import type { CrashEvent } from '../../game/types';

// Pre-allocated scratch math (zero GC in the per-frame tick)
const _mat4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _scale = new THREE.Vector3();
const _color = new THREE.Color();

const PARTICLE_POOL_SIZE = POOLS.particles;
const BREADCRUMB_MAX = POOLS.breadcrumbs;
const FLYING_PARCEL_POOL = POOLS.flyingParcels;
const FLYING_COIN_POOL = POOLS.flyingCoins;
const CRASH_BURST_POOL = POOLS.crashBursts;

const OFFSCREEN = -50;

export interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  r: number;
  g: number;
  b: number;
}

export interface FlyingParcel {
  active: boolean;
  t: number;
  duration: number;
  sx: number;
  sy: number;
  sz: number;
  tx: number;
  ty: number;
  tz: number;
  mesh: THREE.Group;
  onLand?: () => void;
}

export interface FlyingCoin {
  active: boolean;
  delay: number;
  t: number;
  duration: number;
  sx: number;
  sy: number;
  sz: number;
  coinIdx: number;
  mesh: THREE.Group;
}

export interface PooledCrashBurst {
  active: boolean;
  t: number;
  duration: number;
  baseScale: number;
  rig: CrashBurstRig;
}

export interface BreadcrumbNode {
  x: number;
  z: number;
  yaw: number;
}

/** Shared, long-lived geometry/material handles owned by the scene builder. */
export interface EffectsAssets {
  particleSphere: THREE.BufferGeometry;
  particleMat: THREE.Material;
  chevronGeo: THREE.BufferGeometry;
  breadcrumbMat: THREE.Material;
}

export interface SpawnFlyingCoinOptions {
  sx: number;
  sy: number;
  sz: number;
  delay: number;
  duration: number;
  coinIdx: number;
}

export interface EffectsSystemOptions {
  scene: THREE.Scene;
  assets: EffectsAssets;
  /** Fired when a tossed tip coin reaches the van roof. */
  onCoinLand: (coinIdx: number, x: number, y: number, z: number) => void;
}

export interface EffectsSystem {
  readonly particleMesh: THREE.InstancedMesh;
  readonly breadcrumbMesh: THREE.InstancedMesh;
  readonly particles: PooledParticle[];
  readonly flyingParcels: FlyingParcel[];
  readonly flyingCoins: FlyingCoin[];
  readonly crashBursts: PooledCrashBurst[];
  spawnParticleBurst(
    x: number,
    y: number,
    z: number,
    count: number,
    palette: number[],
    speedScale?: number,
  ): void;
  spawnCrashBurstEffect(ev: CrashEvent, camYaw: number): void;
  spawnFlyingCoin(options: SpawnFlyingCoinOptions): void;
  /** The van roof moves every frame, so the live target is pushed in by the caller. */
  setCoinTarget(x: number, y: number, z: number): void;
  updateBreadcrumbs(path: readonly BreadcrumbNode[], visualClock: number): void;
  /** Advances every pooled effect pool in one deterministic order. */
  update(dt: number, camYaw: number): void;
  dispose(): void;
}

/**
 * All short-lived visual effects in the scene: zero-GC particle bursts, the golden
 * route breadcrumb chevrons, tossed parcels, tossed tip coins and crash starbursts.
 *
 * Every pool pre-allocates its meshes and is advanced by index, so the tick never
 * allocates. The system owns no gameplay state; the caller supplies the coin roof
 * target and listens for coin landing.
 */
export function createEffectsSystem({
  scene,
  assets,
  onCoinLand,
}: EffectsSystemOptions): EffectsSystem {
  // ---- Pooled Zero-GC Particle InstancedMesh -----------------------------------
  const particleMesh = new THREE.InstancedMesh(
    assets.particleSphere,
    assets.particleMat,
    PARTICLE_POOL_SIZE,
  );
  particleMesh.frustumCulled = false;
  particleMesh.instanceColor = new THREE.InstancedBufferAttribute(
    new Float32Array(PARTICLE_POOL_SIZE * 3),
    3,
  );
  scene.add(particleMesh);

  const particles: PooledParticle[] = Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
    active: false,
    x: 0,
    y: OFFSCREEN,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    life: 0,
    maxLife: 1,
    size: 1,
    r: 1,
    g: 1,
    b: 1,
  }));
  let particleRingCursor = 0;

  // Initialize particle matrices off-screen once
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    _pos.set(0, OFFSCREEN, 0);
    _quat.identity();
    _scale.setScalar(0.001);
    _mat4.compose(_pos, _quat, _scale);
    particleMesh.setMatrixAt(i, _mat4);
  }

  function spawnParticleBurst(
    x: number,
    y: number,
    z: number,
    count: number,
    palette: number[],
    speedScale: number = 1.0,
  ) {
    for (let i = 0; i < count; i++) {
      const p = particles[particleRingCursor];
      particleRingCursor = (particleRingCursor + 1) % PARTICLE_POOL_SIZE;
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const spd = (1.6 + Math.random() * 2.8) * speedScale;
      const hex = palette[i % palette.length];
      _color.setHex(hex);
      p.active = true;
      p.x = x;
      p.y = y;
      p.z = z;
      p.vx = Math.cos(angle) * spd;
      p.vy = (2.4 + Math.random() * 2.8) * speedScale;
      p.vz = Math.sin(angle) * spd;
      p.maxLife = 0.42 + Math.random() * 0.28;
      p.life = p.maxLife;
      p.size = 0.75 + Math.random() * 0.65;
      p.r = _color.r;
      p.g = _color.g;
      p.b = _color.b;
    }
  }

  // ---- Golden route breadcrumb chevrons ---------------------------------------
  const breadcrumbMesh = new THREE.InstancedMesh(
    assets.chevronGeo,
    assets.breadcrumbMat,
    BREADCRUMB_MAX,
  );
  breadcrumbMesh.frustumCulled = false;
  scene.add(breadcrumbMesh);

  // ---- Flying parcel pool ------------------------------------------------------
  const flyingParcels: FlyingParcel[] = Array.from({ length: FLYING_PARCEL_POOL }, () => {
    const mesh = createMiniParcelMesh(0xf6be6d);
    mesh.visible = false;
    scene.add(mesh);
    return {
      active: false,
      t: 0,
      duration: 0.36,
      sx: 0,
      sy: 0,
      sz: 0,
      tx: 0,
      ty: 0,
      tz: 0,
      mesh,
    };
  });

  // ---- Tossed tip coin pool ----------------------------------------------------
  const flyingCoins: FlyingCoin[] = Array.from({ length: FLYING_COIN_POOL }, () => {
    const mesh = createSpinningCoinMesh();
    mesh.visible = false;
    scene.add(mesh);
    return {
      active: false,
      delay: 0,
      t: 0,
      duration: 0.44,
      sx: 0,
      sy: 0,
      sz: 0,
      coinIdx: 0,
      mesh,
    };
  });
  let flyingCoinCursor = 0;

  const coinTarget = { x: 0, y: 0, z: 0 };

  // ---- Pooled comic starburst + shockwave crash effects -----------------------
  const crashBursts: PooledCrashBurst[] = Array.from({ length: CRASH_BURST_POOL }, () => {
    const rig = createCrashBurstMesh();
    scene.add(rig.root);
    return {
      active: false,
      t: 0,
      duration: 0.44,
      baseScale: 1.0,
      rig,
    };
  });
  let crashBurstCursor = 0;

  function spawnCrashBurstEffect(ev: CrashEvent, camYaw: number) {
    const slot = crashBursts[crashBurstCursor];
    crashBurstCursor = (crashBurstCursor + 1) % CRASH_BURST_POOL;
    const isHeavy = ev.severity === 'crash';
    slot.active = true;
    slot.t = 0;
    slot.duration = isHeavy ? 0.5 : 0.36;
    slot.baseScale = !ev.involvesPlayer ? 0.72 : isHeavy ? 1.18 : 0.86;
    slot.rig.root.position.set(ev.x, ev.y + 0.18, ev.z);
    slot.rig.root.rotation.y = camYaw;
    slot.rig.starBurstGroup.scale.setScalar(0.2);
    slot.rig.shockRing.scale.setScalar(0.35);
    slot.rig.shockRingMat.opacity = 0.92;
    slot.rig.dizzyOrbitGroup.position.y = 0;
    slot.rig.root.visible = true;

    spawnParticleBurst(
      ev.x,
      ev.y + 0.12,
      ev.z,
      !ev.involvesPlayer ? 10 : isHeavy ? 24 : 14,
      ev.kind === 'rival'
        ? [0xffdf24, 0xa855f7, 0xffffff, 0xff595e]
        : [0xffdf24, 0xff595e, 0xffffff, 0xff9f1c, 0xcbd5e1],
      !ev.involvesPlayer ? 0.85 : isHeavy ? 1.35 : 0.98,
    );
  }

  function spawnFlyingCoin(options: SpawnFlyingCoinOptions) {
    const fc = flyingCoins[flyingCoinCursor];
    flyingCoinCursor = (flyingCoinCursor + 1) % FLYING_COIN_POOL;
    fc.active = true;
    fc.delay = options.delay;
    fc.t = 0;
    fc.duration = options.duration;
    fc.sx = options.sx;
    fc.sy = options.sy;
    fc.sz = options.sz;
    fc.coinIdx = options.coinIdx;
    fc.mesh.visible = false;
  }

  function setCoinTarget(x: number, y: number, z: number) {
    coinTarget.x = x;
    coinTarget.y = y;
    coinTarget.z = z;
  }

  function updateBreadcrumbs(path: readonly BreadcrumbNode[], visualClock: number) {
    for (let i = 0; i < BREADCRUMB_MAX; i++) {
      if (i + 1 < path.length) {
        const node = path[i + 1];
        const wave = Math.sin(visualClock * 6 - i * 0.7) * 0.04;
        _pos.set(node.x, 0.29 + wave, node.z);
        _euler.set(0, node.yaw, 0);
        _quat.setFromEuler(_euler);
        _scale.set(0.95, 0.45, 0.95);
        _mat4.compose(_pos, _quat, _scale);
        breadcrumbMesh.setMatrixAt(i, _mat4);
      } else {
        _pos.set(0, OFFSCREEN, 0);
        _quat.identity();
        _scale.set(0.001, 0.001, 0.001);
        _mat4.compose(_pos, _quat, _scale);
        breadcrumbMesh.setMatrixAt(i, _mat4);
      }
    }
    breadcrumbMesh.instanceMatrix.needsUpdate = true;
  }

  function updateFlyingParcels(dt: number) {
    for (const fp of flyingParcels) {
      if (!fp.active) continue;
      fp.t += dt;
      const u = Math.min(1, fp.t / fp.duration);
      const arc = Math.sin(u * Math.PI) * 1.65;
      fp.mesh.position.set(
        fp.sx + (fp.tx - fp.sx) * u,
        fp.sy + (fp.ty - fp.sy) * u + arc,
        fp.sz + (fp.tz - fp.sz) * u,
      );
      fp.mesh.rotation.y += dt * 9;
      fp.mesh.rotation.x = Math.sin(u * Math.PI * 2) * 0.35;
      if (u >= 1) {
        fp.active = false;
        fp.mesh.visible = false;
        fp.onLand?.();
        fp.onLand = undefined;
      }
    }
  }

  function updateFlyingCoins(dt: number) {
    for (const fc of flyingCoins) {
      if (!fc.active) continue;
      if (fc.delay > 0) {
        fc.delay -= dt;
        if (fc.delay > 0) continue;
        fc.mesh.visible = true;
      }
      fc.t += dt;
      const u = Math.min(1, fc.t / fc.duration);
      const arc = Math.sin(u * Math.PI) * 2.15;
      fc.mesh.position.set(
        fc.sx + (coinTarget.x - fc.sx) * u,
        fc.sy + (coinTarget.y - fc.sy) * u + arc,
        fc.sz + (coinTarget.z - fc.sz) * u,
      );
      fc.mesh.rotation.y += dt * 16;
      fc.mesh.rotation.x = Math.sin(u * Math.PI) * 0.4;
      if (u >= 1) {
        fc.active = false;
        fc.mesh.visible = false;
        onCoinLand(fc.coinIdx, coinTarget.x, coinTarget.y, coinTarget.z);
      }
    }
  }

  function updateCrashBursts(dt: number, camYaw: number) {
    for (const cb of crashBursts) {
      if (!cb.active) continue;
      cb.t += dt;
      const u = Math.min(1, cb.t / cb.duration);
      if (u >= 1) {
        cb.active = false;
        cb.rig.root.visible = false;
        continue;
      }
      cb.rig.root.rotation.y = camYaw;
      const starPop =
        u < 0.2
          ? (u / 0.2) * 1.25 * cb.baseScale
          : Math.max(0.02, (1 - (u - 0.2) / 0.8) * 1.15 * cb.baseScale);
      cb.rig.starBurstGroup.scale.setScalar(starPop);
      cb.rig.starBurstGroup.rotation.z = Math.sin(u * Math.PI * 3.5) * 0.32;
      cb.rig.shockRing.scale.setScalar((0.42 + u * 2.05) * cb.baseScale);
      cb.rig.shockRingMat.opacity = (1 - u) * 0.92;
      cb.rig.dizzyOrbitGroup.position.y = u * 0.52;
      cb.rig.dizzyOrbitGroup.rotation.y = cb.t * 11.5;
      cb.rig.dizzyOrbitGroup.scale.setScalar(Math.max(0.05, (1 - u * 0.65) * cb.baseScale));
    }
  }

  function updateParticles(dt: number) {
    let anyParticleChanged = false;
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const p = particles[i];
      if (!p.active) continue;
      anyParticleChanged = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _pos.set(0, OFFSCREEN, 0);
        _scale.setScalar(0.001);
      } else {
        p.vy -= 9.8 * dt;
        p.x += p.vx * dt;
        p.y = Math.max(0.26, p.y + p.vy * dt);
        p.z += p.vz * dt;
        const s = (p.life / p.maxLife) * p.size;
        _pos.set(p.x, p.y, p.z);
        _scale.setScalar(s);
        _color.setRGB(p.r, p.g, p.b);
        particleMesh.setColorAt(i, _color);
      }
      _quat.identity();
      _mat4.compose(_pos, _quat, _scale);
      particleMesh.setMatrixAt(i, _mat4);
    }
    if (anyParticleChanged) {
      particleMesh.instanceMatrix.needsUpdate = true;
      if (particleMesh.instanceColor) {
        particleMesh.instanceColor.needsUpdate = true;
      }
    }
  }

  function update(dt: number, camYaw: number) {
    updateFlyingParcels(dt);
    updateFlyingCoins(dt);
    updateCrashBursts(dt, camYaw);
    updateParticles(dt);
  }

  function dispose() {
    scene.remove(particleMesh);
    scene.remove(breadcrumbMesh);
    for (const fp of flyingParcels) scene.remove(fp.mesh);
    for (const fc of flyingCoins) scene.remove(fc.mesh);
    for (const cb of crashBursts) {
      scene.remove(cb.rig.root);
      cb.rig.shockRingMat.dispose();
    }
  }

  return {
    particleMesh,
    breadcrumbMesh,
    particles,
    flyingParcels,
    flyingCoins,
    crashBursts,
    spawnParticleBurst,
    spawnCrashBurstEffect,
    spawnFlyingCoin,
    setCoinTarget,
    updateBreadcrumbs,
    update,
    dispose,
  };
}
