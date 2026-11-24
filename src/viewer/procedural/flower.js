/**
 * flower.js — Procedural 3D Complete Bisexual Flower.
 * Includes pedicel, receptacle, sepals, petals, stamens (filament + anther),
 * pistil/carpel (ovary, style, stigma), ovules, and nectary.
 */

import * as THREE from 'three';
import { phys, addMesh, namedGroup, tagGroup } from './helpers.js';

export function buildFlower() {
  const root = new THREE.Group();
  root.name = 'flower-procedural';

  // ── 1. Pedicel — green stalk ──────────────────────────────────────
  addMesh(root, 'part_pedicel',
    new THREE.CylinderGeometry(0.07, 0.08, 0.72, 16),
    phys(0x15803d, { roughness: 0.5 }),
    [0, -0.82, 0]
  );

  // ── 2. Receptacle — swollen base holding flower whorls ────────────
  addMesh(root, 'part_receptacle',
    new THREE.SphereGeometry(0.22, 20, 16),
    phys(0x22c55e, { roughness: 0.45 }),
    [0, -0.44, 0],
    null,
    [1.2, 0.7, 1.2]
  );

  // ── 3. Sepals (Calyx) — 5 green leaf-like bases ───────────────────
  const sepGroup = namedGroup('part_sepals');
  const sepGeo = new THREE.ConeGeometry(0.14, 0.48, 8);
  const sepMat = phys(0x4ade80, { roughness: 0.45 });
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + 0.3;
    const s = new THREE.Mesh(sepGeo, sepMat.clone());
    s.position.set(Math.cos(angle) * 0.34, -0.40, Math.sin(angle) * 0.34);
    s.rotation.set(0, -angle, -1.25);
    s.scale.set(1.0, 1.0, 0.25);
    sepGroup.add(s);
  }
  tagGroup(sepGroup);
  root.add(sepGroup);

  // ── 4. Petals (Corolla) — 5 bright pink-magenta petals ────────────
  const petGroup = namedGroup('part_petals');
  const petGeo = new THREE.SphereGeometry(0.32, 18, 16);
  const petMat = phys(0xf472b6, { roughness: 0.35, side: THREE.DoubleSide });
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const p = new THREE.Mesh(petGeo, petMat.clone());
    p.position.set(Math.cos(angle) * 0.56, -0.05, Math.sin(angle) * 0.56);
    p.rotation.set(0, -angle, -0.55);
    p.scale.set(1.25, 0.14, 0.92);
    petGroup.add(p);
  }
  tagGroup(petGroup);
  root.add(petGroup);

  // ── 5. Nectary (NEET) — sweet nectar glands at petal bases ────────
  const necGroup = namedGroup('part_nectary');
  const necGeo = new THREE.SphereGeometry(0.05, 10, 10);
  const necMat = phys(0xfacc15, { roughness: 0.25 });
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + 0.15;
    const n = new THREE.Mesh(necGeo, necMat.clone());
    n.position.set(Math.cos(angle) * 0.22, -0.32, Math.sin(angle) * 0.22);
    necGroup.add(n);
  }
  tagGroup(necGroup);
  root.add(necGroup);

  // ── 6. Filaments (part of Stamen) — 6 slender stalks ──────────────
  const filGroup = namedGroup('part_filament');
  const filGeo = new THREE.CylinderGeometry(0.02, 0.024, 0.62, 10);
  const filMat = phys(0xfde68a, { roughness: 0.4 });
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const f = new THREE.Mesh(filGeo, filMat.clone());
    f.position.set(Math.cos(angle) * 0.28, 0.08, Math.sin(angle) * 0.28);
    f.rotation.set(0, -angle, -0.22);
    filGroup.add(f);
  }
  tagGroup(filGroup);
  root.add(filGroup);

  // ── 7. Anthers (part of Stamen) — 6 pollen-producing golden heads ─
  const antGroup = namedGroup('part_anther');
  const antGeo = new THREE.CapsuleGeometry(0.048, 0.10, 8, 12);
  const antMat = phys(0xf59e0b, { roughness: 0.45 });
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const a = new THREE.Mesh(antGeo, antMat.clone());
    a.position.set(Math.cos(angle) * 0.35, 0.38, Math.sin(angle) * 0.35);
    a.rotation.set(Math.PI / 2, -angle, 0);
    antGroup.add(a);
  }
  tagGroup(antGroup);
  root.add(antGroup);

  // ── 8. Ovary (part of Pistil) — cutaway swollen chamber ───────────
  addMesh(root, 'part_ovary',
    new THREE.SphereGeometry(0.22, 24, 24, 0, Math.PI * 1.45, 0, Math.PI),
    phys(0x84cc16, { transparent: true, opacity: 0.72, side: THREE.DoubleSide }),
    [0, -0.20, 0]
  );

  // ── 9. Ovules — small cream seed precursors inside ovary ──────────
  const ovGroup = namedGroup('part_ovules');
  const ovGeo = new THREE.SphereGeometry(0.045, 12, 12);
  const ovMat = phys(0xfef08a, { roughness: 0.35 });
  const ovSpots = [
    [-0.06, -0.14, 0.04], [0.06, -0.14, 0.04],
    [-0.06, -0.24, 0.04], [0.06, -0.24, 0.04],
    [0.00, -0.19, -0.05],
  ];
  for (const p of ovSpots) {
    const ov = new THREE.Mesh(ovGeo, ovMat.clone());
    ov.position.set(...p);
    ovGroup.add(ov);
  }
  tagGroup(ovGroup);
  root.add(ovGroup);

  // ── 10. Style (part of Pistil) — central column ───────────────────
  addMesh(root, 'part_style',
    new THREE.CylinderGeometry(0.045, 0.06, 0.60, 14),
    phys(0xa3e635, { roughness: 0.4 }),
    [0, 0.25, 0]
  );

  // ── 11. Stigma (part of Pistil) — sticky pollen-catching tip ──────
  addMesh(root, 'part_stigma',
    new THREE.SphereGeometry(0.11, 18, 16),
    phys(0xfacc15, { roughness: 0.3 }),
    [0, 0.58, 0],
    null,
    [1.3, 0.75, 1.3]
  );

  return root;
}

export const FLOWER_COLORS = {
  'pedicel':    0x15803d,
  'receptacle': 0x22c55e,
  'sepals':     0x4ade80,
  'petals':     0xf472b6,
  'nectary':    0xfacc15,
  'stamen':     0xf59e0b,
  'filament':   0xfde68a,
  'anther':     0xf59e0b,
  'pistil':     0xa3e635,
  'ovary':      0x84cc16,
  'ovules':     0xfef08a,
  'style':      0xa3e635,
  'stigma':     0xfacc15,
};

