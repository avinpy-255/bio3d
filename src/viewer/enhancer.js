/**
 * enhancer.js — Runtime visual upgrades for loaded 3D models (both GLB and procedural).
 *
 * Generates lightweight cached 2D CanvasTextures (0 KB external downloads) and
 * enhances PBR materials so models have rich surface detail, nuclear pores,
 * cristae folds, rough-ER ribosomes, chloroplast grana, heart vessels, and scales.
 */

import * as THREE from 'three';

const textureCache = new Map();

function getCanvasTexture(key, drawFn, repeatX = 1, repeatY = 1) {
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, tex);
  return tex;
}

/** Dotted surface pattern (nuclear pores, Rough ER ribosomes, grana dots) */
function makeDotsTexture(key, bg, dotColor, count = 70, radius = 6, repeat = 2) {
  return getCanvasTexture(key, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = dotColor;
    // Deterministic pseudo-random scatter so textures tile cleanly
    let seed = 42;
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (let i = 0; i < count; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = radius * (0.7 + rand() * 0.6);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, repeat, repeat);
}

/** Striped / folded pattern (mitochondrial cristae, heart muscle striations) */
function makeStripesTexture(key, bg, stripeColor, waveAmp = 14, count = 10) {
  return getCanvasTexture(key, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = stripeColor;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    for (let i = 0; i < count; i++) {
      const yBase = (i / count) * h + 12;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 16) {
        const y = yBase + Math.sin((x / w) * Math.PI * 4 + i) * waveAmp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }, 1, 1);
}

/** Fish scale arcs */
function makeScalesTexture() {
  return getCanvasTexture('fish-scales', (ctx, w, h) => {
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 3;
    const step = 32;
    for (let row = 0; row <= h / step + 1; row++) {
      for (let col = 0; col <= w / step + 1; col++) {
        const x = col * step + (row % 2 === 0 ? 0 : step / 2);
        const y = row * step;
        ctx.beginPath();
        ctx.arc(x, y, step * 0.55, 0, Math.PI, false);
        ctx.stroke();
      }
    }
  }, 3, 2);
}

/** Branching vessels (coronary arteries on heart, veins on flower petals) */
function makeVeinsTexture(key, bg, veinColor) {
  return getCanvasTexture(key, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = veinColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const startX = (i / 5) * w;
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.bezierCurveTo(startX + 20, h * 0.35, startX - 25, h * 0.7, startX + 10, h);
      ctx.stroke();
    }
  }, 1, 1);
}

/**
 * Enhance all meshes in a loaded model group with procedural textures & richer PBR polish.
 */
export function enhanceModel(topicId, group) {
  group.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const meshName = obj.userData.meshName ?? obj.name ?? '';
    const mat = obj.material;

    // Subtle sheen on all non-transparent biological surfaces
    if (!mat.transparent && mat.roughness !== undefined) {
      mat.roughness = Math.min(mat.roughness, 0.45);
      mat.envMapIntensity = 1.15;
    }

    if (meshName === 'part_cell-membrane' || meshName === 'part_membrane' || meshName === 'part_capsule') {
      mat.roughness = 0.18;
      mat.metalness = 0.05;
      mat.envMapIntensity = 1.5;
      mat.needsUpdate = true;
    }

    // Preserve models that already have custom vertex colours or baked maps
    if (obj.geometry?.attributes?.color || mat.map) return;

    // ── Topic / Part-specific detail textures (for untextured procedural models) ──
    if (meshName === 'part_nuclear_envelope' || meshName === 'part_nucleus') {
      const tex = makeDotsTexture('nuclear-pores', '#ffffff', '#7c3aed', 65, 5, 2);
      mat.bumpMap = tex;
      mat.bumpScale = 0.025;
      if (meshName === 'part_nuclear_envelope') {
        mat.map = makeDotsTexture('env-pores-map', '#c4b5fd', '#4c1d95', 75, 5, 2);
      }
      mat.needsUpdate = true;
    } else if (meshName === 'part_er_rough') {
      const tex = makeDotsTexture('rough-er-dots', '#06b6d4', '#fde68a', 95, 5, 3);
      mat.map = tex;
      mat.bumpMap = tex;
      mat.bumpScale = 0.03;
      mat.needsUpdate = true;
    } else if (meshName.startsWith('part_mitochondria')) {
      const tex = makeStripesTexture('mito-cristae', '#f97316', '#fde047', 10, 8);
      mat.map = tex;
      mat.bumpMap = tex;
      mat.bumpScale = 0.02;
      mat.needsUpdate = true;
    } else if (meshName.startsWith('part_chloroplast')) {
      const tex = makeDotsTexture('chloro-grana', '#22c55e', '#14532d', 45, 11, 2);
      mat.map = tex;
      mat.bumpMap = tex;
      mat.bumpScale = 0.02;
      mat.needsUpdate = true;
    } else if (meshName === 'part_left-ventricle' || meshName === 'part_right-ventricle') {
      const bg = meshName === 'part_left-ventricle' ? '#dc2626' : '#2563eb';
      const vein = meshName === 'part_left-ventricle' ? '#991b1b' : '#1e3a8a';
      const tex = makeVeinsTexture(`heart-${meshName}`, bg, vein);
      mat.map = tex;
      mat.bumpMap = tex;
      mat.bumpScale = 0.018;
      mat.needsUpdate = true;
    } else if (meshName === 'part_petals') {
      const tex = makeVeinsTexture('petal-veins', '#f472b6', '#be185d');
      mat.map = tex;
      mat.needsUpdate = true;
    } else if (meshName === 'part_body' && topicId === 'fish') {
      const tex = makeScalesTexture();
      mat.map = tex;
      mat.bumpMap = tex;
      mat.bumpScale = 0.02;
      mat.needsUpdate = true;
    }
  });
}

