/**
 * leaf.js — Procedural 3D Leaf Cross-Section (anatomical tissue block).
 * Shows cuticle, upper/lower epidermis, palisade & spongy mesophyll,
 * stomata + guard cells, xylem, phloem, bundle sheath, and air spaces.
 */

import * as THREE from 'three';
import { phys, addMesh, namedGroup, tagGroup } from './helpers.js';

export function buildLeaf() {
  const root = new THREE.Group();
  root.name = 'leaf-procedural';

  // ── 1. Waxy Cuticle — glossy thin top sheet ──────────────────────
  addMesh(root, 'part_cuticle',
    new THREE.BoxGeometry(2.05, 0.05, 1.35),
    phys(0xd9f99d, { transparent: true, opacity: 0.72, roughness: 0.15 }),
    [0, 0.66, 0]
  );

  // ── 2. Upper Epidermis — flat translucent cell bricks ─────────────
  const ueGroup = namedGroup('part_upper-epidermis');
  const ueMat = phys(0xa3e635, { transparent: true, opacity: 0.68, roughness: 0.4 });
  for (let i = -3; i <= 3; i++) {
    for (let k = -1; k <= 1; k++) {
      const cell = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.14, 0.42), ueMat.clone());
      cell.position.set(i * 0.285, 0.56, k * 0.44);
      ueGroup.add(cell);
    }
  }
  tagGroup(ueGroup);
  root.add(ueGroup);

  // ── 3. Palisade Mesophyll — tightly packed vertical green columns ─
  const palGroup = namedGroup('part_palisade-mesophyll');
  const palGeo = new THREE.CylinderGeometry(0.095, 0.095, 0.48, 12);
  const palMat = phys(0x16a34a, { roughness: 0.45 });
  for (let i = -3; i <= 3; i++) {
    for (let k = -1; k <= 1; k++) {
      const col = new THREE.Mesh(palGeo, palMat.clone());
      col.position.set(i * 0.27, 0.24, k * 0.38);
      palGroup.add(col);
    }
  }
  tagGroup(palGroup);
  root.add(palGroup);

  // ── 4. Spongy Mesophyll — loosely arranged irregular rounded cells ─
  const spGroup = namedGroup('part_spongy-mesophyll');
  const spGeo = new THREE.SphereGeometry(0.13, 14, 14);
  const spMat = phys(0x4ade80, { roughness: 0.5 });
  const spSpots = [
    [-0.78, -0.14, 0.35], [-0.65, -0.34, -0.25], [-0.42, -0.20, 0.12],
    [-0.38, -0.40, 0.42], [0.42, -0.18, 0.30], [0.55, -0.38, -0.20],
    [0.78, -0.16, 0.20], [0.76, -0.38, 0.35], [0.52, -0.22, -0.45],
    [-0.72, -0.22, -0.42], [0.22, -0.42, 0.44], [-0.15, -0.42, -0.42],
  ];
  for (const p of spSpots) {
    const c = new THREE.Mesh(spGeo, spMat.clone());
    c.position.set(...p);
    c.scale.set(1.1, 0.85, 1.0);
    spGroup.add(c);
  }
  tagGroup(spGroup);
  root.add(spGroup);

  // ── 5. Air Spaces (NEET) — gas-exchange pockets in spongy layer ───
  const airGroup = namedGroup('part_air-spaces');
  const airGeo = new THREE.SphereGeometry(0.11, 12, 12);
  const airMat = phys(0x38bdf8, { transparent: true, opacity: 0.35, depthWrite: false });
  const airSpots = [
    [-0.55, -0.28, 0.25], [0.64, -0.28, 0.08], [0.0, -0.42, 0.22],
  ];
  for (const p of airSpots) {
    const a = new THREE.Mesh(airGeo, airMat.clone());
    a.position.set(...p);
    airGroup.add(a);
  }
  tagGroup(airGroup);
  root.add(airGroup);

  // ── 6. Bundle Sheath (NEET) — ring around the vascular vein ───────
  addMesh(root, 'part_bundle-sheath',
    new THREE.CylinderGeometry(0.27, 0.27, 1.32, 20, 1, true),
    phys(0xca8a04, { transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
    [0, -0.15, 0],
    [Math.PI / 2, 0, 0]
  );

  // ── 7. Xylem — upper vessels in vein carrying water (red/pink) ────
  const xyGroup = namedGroup('part_xylem');
  const xyGeo = new THREE.CylinderGeometry(0.055, 0.055, 1.38, 12);
  const xyMat = phys(0xef4444, { roughness: 0.4 });
  for (const xOff of [-0.08, 0.08, 0]) {
    const v = new THREE.Mesh(xyGeo, xyMat.clone());
    v.position.set(xOff, -0.05 + (xOff === 0 ? 0.06 : 0), 0);
    v.rotation.x = Math.PI / 2;
    xyGroup.add(v);
  }
  tagGroup(xyGroup);
  root.add(xyGroup);

  // ── 8. Phloem — lower sieve tubes carrying sugars (blue) ──────────
  const phGroup = namedGroup('part_phloem');
  const phGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.38, 12);
  const phMat = phys(0x3b82f6, { roughness: 0.4 });
  for (const xOff of [-0.07, 0.07, 0]) {
    const v = new THREE.Mesh(phGeo, phMat.clone());
    v.position.set(xOff, -0.25 - (xOff === 0 ? 0.05 : 0), 0);
    v.rotation.x = Math.PI / 2;
    phGroup.add(v);
  }
  tagGroup(phGroup);
  root.add(phGroup);

  // ── 9. Lower Epidermis — bottom layer with gap for stomata ────────
  const leGroup = namedGroup('part_lower-epidermis');
  const leMat = phys(0x84cc16, { transparent: true, opacity: 0.7, roughness: 0.4 });
  for (const x of [-0.84, -0.56, -0.28, 0.28, 0.56, 0.84]) {
    for (let k = -1; k <= 1; k++) {
      const cell = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.13, 0.42), leMat.clone());
      cell.position.set(x, -0.60, k * 0.44);
      leGroup.add(cell);
    }
  }
  tagGroup(leGroup);
  root.add(leGroup);

  // ── 10. Stomata & Guard Cells — paired kidney-shaped pores at bottom
  const stGroup = namedGroup('part_stomata');
  const gGeo = new THREE.CapsuleGeometry(0.055, 0.16, 6, 12);
  const gMat = phys(0xfbbf24, { roughness: 0.35 });
  for (const z of [-0.25, 0.25]) {
    const g1 = new THREE.Mesh(gGeo, gMat.clone());
    g1.position.set(-0.07, -0.60, z);
    g1.rotation.x = Math.PI / 2;
    const g2 = new THREE.Mesh(gGeo, gMat.clone());
    g2.position.set(0.07, -0.60, z);
    g2.rotation.x = Math.PI / 2;
    stGroup.add(g1, g2);
  }
  tagGroup(stGroup);
  root.add(stGroup);

  return root;
}

export const LEAF_COLORS = {
  'cuticle':            0xd9f99d,
  'upper-epidermis':    0xa3e635,
  'palisade-mesophyll': 0x16a34a,
  'spongy-mesophyll':   0x4ade80,
  'air-spaces':         0x38bdf8,
  'bundle-sheath':      0xca8a04,
  'xylem':              0xef4444,
  'phloem':             0x3b82f6,
  'lower-epidermis':    0x84cc16,
  'stomata':            0xfbbf24,
};

