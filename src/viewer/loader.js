/**
 * loader.js — Loads a topic's 3D model.
 *
 * Strategy:
 *  1. Try to load the GLB specified in topicData.model.src.
 *  2. If the GLB doesn't exist (404 / network error), fall back to a
 *     procedural builder registered for the topic ID.
 *
 * Returns { group, pickables, allMeshes }
 *  - group:     the THREE.Group added to the scene
 *  - pickables: meshes that can be raycasted (have a known meshName in the topic JSON)
 *  - allMeshes: every mesh in the group (for highlight/dim)
 */

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BUILDERS } from './procedural/index.js';

/**
 * @param {object}       topicData    Full topic JSON
 * @param {THREE.Scene}  scene
 * @param {function}     [onProgress] Called with 0–1 fraction
 * @returns {Promise<{ group, pickables, allMeshes }>}
 */
export async function loadModel(topicData, scene, onProgress) {
  const { model, parts } = topicData;

  // Build a lookup: meshName → partIds[] from topic JSON
  const knownMeshNames = new Set();
  for (const part of parts) {
    for (const name of part.meshNames) knownMeshNames.add(name);
  }

  let group = null;

  // ── 1. Try the GLB ────────────────────────────────────────────────
  if (model?.src) {
    try {
      onProgress?.(0.05);
      group = await loadGLTF(model.src, (p) => onProgress?.(0.05 + p * 0.9));
      onProgress?.(1);
    } catch (e) {
      console.info(`[bio3d] GLB not available (${e.message}) — using procedural model`);
      group = null;
    }
  }

  // ── 2. Fall back to procedural builder ───────────────────────────
  if (!group) {
    const builder = BUILDERS[topicData.id];
    if (!builder) {
      throw new Error(`No model source or procedural builder for topic: ${topicData.id}`);
    }
    group = builder();
    onProgress?.(1);
  }

  scene.add(group);

  // ── 3. Tag children of named groups ──────────────────────────────
  // Groups named "part_*" propagate meshName to their child meshes.
  group.traverse(obj => {
    if (obj.name.startsWith('part_') && !obj.isMesh && !obj.isLine) {
      const meshName = obj.name;
      obj.traverse(child => {
        if ((child.isMesh || child.isLine) && !child.userData.meshName) {
          child.userData.meshName = meshName;
        }
      });
    }
    // Individual meshes with correct name
    if ((obj.isMesh || obj.isLine) && !obj.userData.meshName && obj.name.startsWith('part_')) {
      obj.userData.meshName = obj.name;
    }
  });

  // ── 4. Collect pickable and all meshes ───────────────────────────
  const pickables = [];
  const allMeshes = [];

  group.traverse(obj => {
    if (obj.isMesh || obj.isLine) {
      allMeshes.push(obj);
      // Only add to pickables if this mesh name is known in the topic JSON
      if (obj.userData.meshName && knownMeshNames.has(obj.userData.meshName)) {
        pickables.push(obj);
      }
    }
  });

  return { group, pickables, allMeshes };
}

function loadGLTF(src, onProgress) {
  return new Promise((resolve, reject) => {
    // Check if the resource actually exists and is not an HTML 404 fallback
    fetch(src, { method: 'HEAD' })
      .then(res => {
        if (!res.ok) {
          throw new Error(`Model request returned HTTP ${res.status}`);
        }
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
          throw new Error('Model URL returned HTML (likely 404 SPA fallback)');
        }

        const loader = new GLTFLoader();
        loader.load(
          src,
          gltf => resolve(gltf.scene),
          evt => { if (evt.lengthComputable) onProgress?.(evt.loaded / evt.total); },
          reject
        );
      })
      .catch(reject);
  });
}

