import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface StaticBatchStats {
  /** Meshes considered before batching. */
  sourceMeshes: number;
  /** Meshes that could not be batched (instanced, multi-material, no position). */
  skipped: number;
  /** Batches that produced a merged mesh. */
  buckets: number;
  /** Meshes that remained as individual draw calls. */
  mergedMeshes: number;
}

interface Bucket {
  material: THREE.Material;
  castShadow: boolean;
  receiveShadow: boolean;
  geoms: THREE.BufferGeometry[];
}

function attributeSignature(geo: THREE.BufferGeometry): string {
  const names = Object.keys(geo.attributes).sort();
  let sig = geo.index ? 'indexed|' : 'plain|';
  for (const name of names) {
    const attr = geo.attributes[name] as THREE.BufferAttribute;
    sig += `${name}:${attr.itemSize}:${attr.normalized ? 1 : 0};`;
  }
  return sig;
}

/**
 * Collapses static decoration (buildings, trees, street furniture, signs) into a few
 * merged meshes, one per material/attribute-set bucket.
 *
 * The scene ships roughly 5,500 individual meshes for a single level, which costs
 * thousands of draw calls per frame. Every one of these props is baked into world
 * space once and never moves, so their geometry can be merged with the transform
 * applied. Dynamic rigs (pedestrians, hazards, boats, the truck) are simply not
 * passed in here, so they keep their own transforms.
 *
 * Source geometries are shared/cached by the mesh factories and are therefore never
 * disposed here; only the merged clones are new allocations.
 */
export function batchStaticDecor(
  parent: THREE.Object3D,
  roots: readonly THREE.Object3D[],
): StaticBatchStats {
  parent.updateWorldMatrix(true, false);
  const parentInverse = new THREE.Matrix4().copy(parent.matrixWorld).invert();

  const buckets = new Map<string, Bucket>();
  let sourceMeshes = 0;
  let skipped = 0;

  for (const root of roots) {
    // Depth-first refresh: roots alone are not enough, every descendant's
    // matrixWorld must be current before its vertices are baked to world space.
    root.updateMatrixWorld(true);
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!(mesh as unknown as { isMesh?: boolean }).isMesh) return;
      sourceMeshes += 1;
      if ((mesh as unknown as { isInstancedMesh?: boolean }).isInstancedMesh) {
        skipped += 1;
        return;
      }
      const material = mesh.material as THREE.Material | THREE.Material[];
      if (Array.isArray(material) || !material) {
        skipped += 1;
        return;
      }
      const geo = mesh.geometry;
      if (!geo || !geo.attributes.position) {
        skipped += 1;
        return;
      }
      const key =
        material.uuid +
        '|' +
        (mesh.castShadow ? 1 : 0) +
        (mesh.receiveShadow ? 1 : 0) +
        '|' +
        attributeSignature(geo);
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = {
          material,
          castShadow: mesh.castShadow,
          receiveShadow: mesh.receiveShadow,
          geoms: [],
        };
        buckets.set(key, bucket);
      }
      mesh.updateWorldMatrix(true, false);
      const baked = geo.clone();
      baked.applyMatrix4(new THREE.Matrix4().multiplyMatrices(parentInverse, mesh.matrixWorld));
      bucket.geoms.push(baked);
    });
  }

  let bucketsMade = 0;
  let mergedMeshes = 0;
  for (const bucket of buckets.values()) {
    const merged = bucket.geoms.length >= 2 ? mergeGeometries(bucket.geoms, false) : null;
    if (merged) {
      for (const g of bucket.geoms) g.dispose();
      const mesh = new THREE.Mesh(merged, bucket.material);
      mesh.castShadow = bucket.castShadow;
      mesh.receiveShadow = bucket.receiveShadow;
      mesh.name = 'batched-static';
      parent.add(mesh);
      bucketsMade += 1;
      mergedMeshes += bucket.geoms.length;
      continue;
    }
    // Never drop geometry: if a bucket cannot be merged, emit one mesh per
    // geometry so the decor still renders instead of vanishing silently.
    for (const g of bucket.geoms) {
      const mesh = new THREE.Mesh(g, bucket.material);
      mesh.castShadow = bucket.castShadow;
      mesh.receiveShadow = bucket.receiveShadow;
      mesh.name = 'batched-static';
      parent.add(mesh);
      bucketsMade += 1;
    }
  }

  // Safe now that every collected geometry lives in the scene again.
  for (const root of roots) {
    if (root.parent) root.parent.remove(root);
  }
  return { sourceMeshes, skipped, buckets: bucketsMade, mergedMeshes };
}
