/**
 * plant-cell.js — Procedural 3D Plant Cell (rectangular box with cutaway front).
 * Distinguishing features: rigid cell wall, large central vacuole, chloroplasts, plasmodesmata.
 */

import * as THREE from 'three';
import { phys, addMesh, namedGroup, tagGroup } from './helpers.js';

export function buildPlantCell() {
  const root = new THREE.Group();
  root.name = 'plant-cell-procedural';

  // ── 1. Cell Wall — rigid outer green frame (open cutaway box) ─────
  const wallGroup = namedGroup('part_cell-wall');
  const wallMat = phys(0x16a34a, { transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false });
  const wallBack = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.65, 0.08), wallMat);
  wallBack.position.set(0, 0, -0.78);
  const wallBottom = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 1.6), wallMat.clone());
  wallBottom.position.set(0, -0.80, 0);
  const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.65, 1.6), wallMat.clone());
  wallLeft.position.set(-1.02, 0, 0);
  const wallRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.65, 1.6), wallMat.clone());
  wallRight.position.set(1.02, 0, 0);
  const wallTop = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 1.6), wallMat.clone());
  wallTop.position.set(0, 0.80, 0);
  wallGroup.add(wallBack, wallBottom, wallLeft, wallRight, wallTop);
  tagGroup(wallGroup);
  root.add(wallGroup);

  // ── 2. Cell Membrane — thin yellow-green inner lining ─────────────
  const memGroup = namedGroup('part_cell-membrane');
  const memMat = phys(0xfacc15, { transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
  const mBack = new THREE.Mesh(new THREE.BoxGeometry(1.94, 1.50, 0.04), memMat);
  mBack.position.set(0, 0, -0.70);
  const mBottom = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.04, 1.44), memMat.clone());
  mBottom.position.set(0, -0.73, 0);
  memGroup.add(mBack, mBottom);
  tagGroup(memGroup);
  root.add(memGroup);

  // ── 3. Cytoplasm — faint translucent gel slab ─────────────────────
  addMesh(root, 'part_cytoplasm',
    new THREE.BoxGeometry(1.88, 0.25, 1.38),
    phys(0xbef264, { transparent: true, opacity: 0.16, depthWrite: false }),
    [0, -0.58, 0]
  );

  // ── 4. Large Central Vacuole — dominant sky-blue sac ──────────────
  addMesh(root, 'part_large-vacuole',
    new THREE.SphereGeometry(0.56, 32, 24),
    phys(0x38bdf8, { transparent: true, opacity: 0.62, roughness: 0.12, depthWrite: false }),
    [0.24, 0.05, -0.05],
    [0, 0, 0],
    [1.15, 0.85, 0.85]
  );

  // ── 5. Nucleus — pushed to one side by the large vacuole ──────────
  addMesh(root, 'part_nucleus',
    new THREE.SphereGeometry(0.25, 28, 28, 0, Math.PI * 1.45, 0, Math.PI),
    phys(0x7c3aed, { roughness: 0.35, side: THREE.DoubleSide }),
    [-0.58, 0.22, 0.08]
  );

  // ── 6. Nucleolus (NEET) — dark core inside nucleus ────────────────
  addMesh(root, 'part_nucleolus',
    new THREE.SphereGeometry(0.08, 16, 16),
    phys(0x4c1d95),
    [-0.55, 0.25, 0.14]
  );

  // ── 7. Chloroplasts — 4 emerald green discoids with internal stacks ─
  const chloroSpots = [
    { pos: [-0.60, -0.35, 0.30], rot: [0.3, 0.2, 0.4] },
    { pos: [0.58, -0.42, 0.32], rot: [-0.2, 0.5, -0.3] },
    { pos: [-0.15, 0.54, 0.28], rot: [0.4, 0, 0.1] },
    { pos: [0.72, 0.42, -0.25], rot: [0.2, -0.4, 0.6] },
  ];
  chloroSpots.forEach((s, idx) => {
    addMesh(root, `part_chloroplast_${idx + 1}`,
      new THREE.CapsuleGeometry(0.09, 0.18, 8, 16),
      phys(0x22c55e, { roughness: 0.35 }),
      s.pos, s.rot, [1.2, 0.85, 0.7]
    );
  });

  // ── 8. Mitochondria — 2 orange capsules ───────────────────────────
  const mitoSpots = [
    { pos: [-0.28, -0.38, -0.25], rot: [0.2, 0.3, -0.6] },
    { pos: [0.05, -0.44, 0.42], rot: [0, 0.4, 0.8] },
  ];
  mitoSpots.forEach((s, idx) => {
    addMesh(root, `part_mitochondria_${idx + 1}`,
      new THREE.CapsuleGeometry(0.055, 0.16, 8, 14),
      phys(0xf97316, { roughness: 0.5 }),
      s.pos, s.rot
    );
  });

  // ── 9. Endoplasmic Reticulum — wrapped beside nucleus ─────────────
  addMesh(root, 'part_endoplasmic-reticulum',
    new THREE.TorusGeometry(0.24, 0.04, 8, 24, Math.PI * 1.4),
    phys(0x06b6d4, { roughness: 0.55 }),
    [-0.55, 0.12, 0.05],
    [Math.PI / 3, 0.3, -0.4]
  );

  // ── 10. Golgi Apparatus — stacked amber discs ─────────────────────
  const golgiGroup = namedGroup('part_golgi');
  golgiGroup.position.set(-0.62, -0.15, -0.30);
  for (let i = 0; i < 4; i++) {
    const disc = new THREE.Mesh(
      new THREE.TorusGeometry(0.09 + i * 0.015, 0.018, 6, 18),
      phys(0xfbbf24, { roughness: 0.45 })
    );
    disc.position.y = i * 0.038;
    golgiGroup.add(disc);
  }
  tagGroup(golgiGroup);
  root.add(golgiGroup);

  // ── 11. Ribosomes — tiny cream spheres ────────────────────────────
  const ribGroup = namedGroup('part_ribosomes');
  const ribGeo = new THREE.SphereGeometry(0.022, 8, 8);
  const ribMat = phys(0xfde68a, { roughness: 0.7 });
  const ribPos = [
    [-0.42, 0.40, 0.25], [-0.30, -0.15, 0.38], [0.22, -0.50, 0.18],
    [0.65, -0.12, 0.35], [-0.72, -0.05, 0.28], [0.35, 0.54, 0.20],
  ];
  for (const p of ribPos) {
    const r = new THREE.Mesh(ribGeo, ribMat.clone());
    r.position.set(...p);
    ribGroup.add(r);
  }
  tagGroup(ribGroup);
  root.add(ribGroup);

  // ── 12. Plasmodesmata (NEET) — channels piercing the cell wall ────
  const plasGroup = namedGroup('part_plasmodesmata');
  const plasGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.18, 10);
  const plasMat = phys(0xa3e635, { roughness: 0.4 });
  const plasSpots = [
    { pos: [1.02, 0.22, 0.15], rot: [0, 0, Math.PI / 2] },
    { pos: [1.02, -0.25, -0.15], rot: [0, 0, Math.PI / 2] },
    { pos: [-1.02, -0.18, 0.20], rot: [0, 0, Math.PI / 2] },
  ];
  for (const s of plasSpots) {
    const p = new THREE.Mesh(plasGeo, plasMat.clone());
    p.position.set(...s.pos);
    p.rotation.set(...s.rot);
    plasGroup.add(p);
  }
  tagGroup(plasGroup);
  root.add(plasGroup);

  // ── 13. Amyloplast (NEET) — starch-storing leucoplast ─────────────
  addMesh(root, 'part_amyloplast',
    new THREE.SphereGeometry(0.11, 16, 16),
    phys(0xe2e8f0, { roughness: 0.6 }),
    [0.68, -0.22, -0.28],
    null,
    [1.2, 0.9, 0.9]
  );

  // ── 14. Peroxisome (NEET) ─────────────────────────────────────────
  addMesh(root, 'part_peroxisome',
    new THREE.SphereGeometry(0.07, 14, 14),
    phys(0xfb7185, { roughness: 0.5 }),
    [-0.08, -0.25, 0.45]
  );

  return root;
}

export const PLANT_CELL_COLORS = {
  'cell-wall':             0x16a34a,
  'cell-membrane':         0xfacc15,
  'cytoplasm':             0xbef264,
  'large-vacuole':         0x38bdf8,
  'nucleus':               0x7c3aed,
  'nucleolus':             0x4c1d95,
  'chloroplast':           0x22c55e,
  'mitochondria':          0xf97316,
  'endoplasmic-reticulum': 0x06b6d4,
  'golgi-apparatus':       0xfbbf24,
  'ribosomes':             0xfde68a,
  'plasmodesmata':         0xa3e635,
  'amyloplast':            0xe2e8f0,
  'peroxisome':            0xfb7185,
};

