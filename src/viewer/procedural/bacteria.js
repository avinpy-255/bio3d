/**
 * bacteria.js — Procedural 3D Prokaryotic Bacterial Cell (rod-shaped bacillus).
 * Highlights prokaryotic features: capsule, cell wall, plasma membrane, nucleoid,
 * 70S ribosomes, plasmid, mesosome, pili, and flagellum.
 */

import * as THREE from 'three';
import { phys, addMesh, namedGroup, tagGroup } from './helpers.js';

export function buildBacteria() {
  const root = new THREE.Group();
  root.name = 'bacteria-procedural';

  // ── 1. Capsule — outermost slimy cutaway shell ────────────────────
  addMesh(root, 'part_capsule',
    new THREE.CylinderGeometry(0.56, 0.56, 1.35, 32, 1, false, 0, Math.PI * 1.45),
    phys(0xa855f7, { transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }),
    [0, 0, 0],
    [0, 0, Math.PI / 2]
  );

  // ── 2. Cell Wall — peptidoglycan cutaway layer ────────────────────
  addMesh(root, 'part_cell-wall',
    new THREE.CylinderGeometry(0.50, 0.50, 1.28, 32, 1, false, 0, Math.PI * 1.45),
    phys(0xf97316, { transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }),
    [0, 0, 0],
    [0, 0, Math.PI / 2]
  );

  // ── 3. Plasma Membrane — innermost cutaway layer ──────────────────
  addMesh(root, 'part_plasma-membrane',
    new THREE.CylinderGeometry(0.45, 0.45, 1.22, 32, 1, false, 0, Math.PI * 1.45),
    phys(0xfacc15, { transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
    [0, 0, 0],
    [0, 0, Math.PI / 2]
  );

  // ── 4. Cytoplasm — translucent interior bed ───────────────────────
  addMesh(root, 'part_cytoplasm',
    new THREE.CapsuleGeometry(0.41, 0.80, 12, 24),
    phys(0x38bdf8, { transparent: true, opacity: 0.14, depthWrite: false }),
    [0, 0, 0],
    [0, 0, Math.PI / 2]
  );

  // ── 5. Nucleoid — tangled circular DNA (no nuclear membrane!) ─────
  addMesh(root, 'part_nucleoid',
    new THREE.TorusKnotGeometry(0.20, 0.025, 80, 10, 3, 5),
    phys(0x22d3ee, { roughness: 0.35 }),
    [-0.10, 0, 0],
    [0, 0.4, 0]
  );

  // ── 6. Plasmid (NEET) — small extra-chromosomal DNA ring ──────────
  addMesh(root, 'part_plasmid',
    new THREE.TorusGeometry(0.085, 0.015, 8, 24),
    phys(0x4ade80, { roughness: 0.3 }),
    [0.36, 0.14, 0.15],
    [0.5, 0.3, 0]
  );

  // ── 7. 70S Ribosomes — scattered small granules ───────────────────
  const ribGroup = namedGroup('part_ribosomes');
  const ribGeo = new THREE.SphereGeometry(0.028, 8, 8);
  const ribMat = phys(0xfde68a, { roughness: 0.7 });
  const ribSpots = [
    [0.25, -0.18, 0.22], [0.45, -0.08, -0.10], [-0.45, 0.16, 0.18],
    [-0.38, -0.20, 0.10], [0.12, 0.24, -0.18], [0.52, 0.02, 0.12],
    [-0.50, -0.06, -0.15], [0.28, 0.22, -0.05],
  ];
  for (const p of ribSpots) {
    const r = new THREE.Mesh(ribGeo, ribMat.clone());
    r.position.set(...p);
    ribGroup.add(r);
  }
  tagGroup(ribGroup);
  root.add(ribGroup);

  // ── 8. Mesosome (NEET) — inward fold of plasma membrane ───────────
  addMesh(root, 'part_mesosome',
    new THREE.TorusGeometry(0.08, 0.025, 8, 18),
    phys(0xfbbf24, { roughness: 0.4 }),
    [0.10, -0.34, 0.12],
    [Math.PI / 2, 0, 0]
  );

  // ── 9. Inclusion Bodies (NEET) — reserve food granules ────────────
  const incGroup = namedGroup('part_inclusion-bodies');
  const inc1 = new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 14), phys(0xf472b6));
  inc1.position.set(-0.42, -0.10, 0.22);
  const inc2 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 14), phys(0xf472b6));
  inc2.position.set(0.45, -0.18, 0.05);
  incGroup.add(inc1, inc2);
  tagGroup(incGroup);
  root.add(incGroup);

  // ── 10. Flagellum — long whip-like tail for locomotion ────────────
  const flagCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.68, 0.00, 0.00),
    new THREE.Vector3(-1.00, 0.14, 0.08),
    new THREE.Vector3(-1.32, -0.14, -0.08),
    new THREE.Vector3(-1.62, 0.12, 0.05),
    new THREE.Vector3(-1.88, -0.05, 0.00),
  ]);
  addMesh(root, 'part_flagellum',
    new THREE.TubeGeometry(flagCurve, 32, 0.024, 10, false),
    phys(0x2dd4bf, { roughness: 0.3 })
  );

  // ── 11. Pili / Fimbriae — short bristles around the outer surface ─
  const piliGroup = namedGroup('part_pili');
  const pilGeo = new THREE.CylinderGeometry(0.008, 0.012, 0.24, 6);
  const pilMat = phys(0xe2e8f0, { roughness: 0.5 });
  const pilSpots = [
    { pos: [0.30, 0.62, 0.05], rot: [0, 0, -0.2] },
    { pos: [-0.25, 0.62, -0.08], rot: [0, 0, 0.25] },
    { pos: [0.05, -0.62, 0.10], rot: [0.1, 0, 0.05] },
    { pos: [-0.40, -0.60, 0.0], rot: [0, 0, -0.3] },
    { pos: [0.76, 0.25, 0.05], rot: [0, 0, -1.1] },
    { pos: [0.78, -0.20, -0.05], rot: [0, 0, -1.9] },
    { pos: [0.10, 0.56, -0.35], rot: [-0.6, 0, 0] },
    { pos: [-0.15, -0.56, -0.35], rot: [0.6, 0, 0] },
  ];
  for (const s of pilSpots) {
    const pil = new THREE.Mesh(pilGeo, pilMat.clone());
    pil.position.set(...s.pos);
    pil.rotation.set(...s.rot);
    piliGroup.add(pil);
  }
  tagGroup(piliGroup);
  root.add(piliGroup);

  return root;
}

export const BACTERIA_COLORS = {
  'capsule':           0xa855f7,
  'cell-wall':         0xf97316,
  'plasma-membrane':   0xfacc15,
  'cytoplasm':         0x38bdf8,
  'nucleoid':          0x22d3ee,
  'plasmid':           0x4ade80,
  'ribosomes':         0xfde68a,
  'mesosome':          0xfbbf24,
  'inclusion-bodies':  0xf472b6,
  'flagellum':         0x2dd4bf,
  'pili':              0xe2e8f0,
};

