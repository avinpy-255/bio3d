/**
 * fish.js — Procedural 3D Fish (Animals category: external & internal structures).
 * Covers body & scales, head/mouth, eye, operculum (gill cover), dorsal/pectoral/
 * pelvic/anal/tail fins, lateral line, gills, and swim bladder.
 */

import * as THREE from 'three';
import { phys, addMesh, namedGroup, tagGroup } from './helpers.js';

export function buildFish() {
  const root = new THREE.Group();
  root.name = 'fish-procedural';

  // ── 1. Body & Scales — streamlined fuselage ───────────────────────
  addMesh(root, 'part_body',
    new THREE.SphereGeometry(0.45, 32, 24),
    phys(0x38bdf8, { transparent: true, opacity: 0.78, roughness: 0.35 }),
    [0.05, 0, 0],
    null,
    [1.85, 0.95, 0.62]
  );

  // ── 2. Head & Mouth — tapered anterior nose ───────────────────────
  addMesh(root, 'part_head-mouth',
    new THREE.ConeGeometry(0.32, 0.55, 20),
    phys(0x0284c7, { roughness: 0.4 }),
    [0.82, -0.02, 0],
    [0, 0, -Math.PI / 2],
    [0.95, 1.0, 0.65]
  );

  // ── 3. Eyes — paired dark pupils + golden iris rings ──────────────
  const eyeGroup = namedGroup('part_eye');
  for (const zSign of [1, -1]) {
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.068, 16, 16), phys(0xfacc15, { roughness: 0.2 }));
    iris.position.set(0.70, 0.10, zSign * 0.16);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 12), phys(0x0f172a, { roughness: 0.1 }));
    pupil.position.set(0.71, 0.10, zSign * 0.20);
    eyeGroup.add(iris, pupil);
  }
  tagGroup(eyeGroup);
  root.add(eyeGroup);

  // ── 4. Operculum (Gill Cover) — curved flaps behind head ──────────
  const opGroup = namedGroup('part_operculum');
  for (const zSign of [1, -1]) {
    const op = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 16, 0, Math.PI, 0, Math.PI),
      phys(0x7dd3fc, { transparent: true, opacity: 0.72, side: THREE.DoubleSide })
    );
    op.position.set(0.48, -0.02, zSign * 0.14);
    op.rotation.y = zSign > 0 ? 0 : Math.PI;
    op.scale.set(0.8, 1.15, 0.6);
    opGroup.add(op);
  }
  tagGroup(opGroup);
  root.add(opGroup);

  // ── 5. Gills (NEET) — bright red feathery arches under operculum ──
  const gillGroup = namedGroup('part_gills');
  const gillMat = phys(0xef4444, { roughness: 0.5 });
  for (let i = 0; i < 3; i++) {
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.022, 8, 16, Math.PI * 0.9),
      gillMat.clone()
    );
    arch.position.set(0.46 - i * 0.04, -0.02, 0.10);
    arch.rotation.set(0, 0.3, -Math.PI / 2.2);
    gillGroup.add(arch);
  }
  tagGroup(gillGroup);
  root.add(gillGroup);

  // ── 6. Dorsal Fin — top fin for balance ───────────────────────────
  addMesh(root, 'part_dorsal-fin',
    new THREE.ConeGeometry(0.26, 0.45, 4),
    phys(0xfb923c, { roughness: 0.45 }),
    [0.02, 0.48, 0],
    [0, 0, 0.35],
    [1.3, 1.0, 0.12]
  );

  // ── 7. Pectoral Fins — side steering fins ─────────────────────────
  const pecGroup = namedGroup('part_pectoral-fin');
  for (const zSign of [1, -1]) {
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.36, 4), phys(0xfdba74, { roughness: 0.45 }));
    fin.position.set(0.30, -0.14, zSign * 0.32);
    fin.rotation.set(zSign * 0.8, 0, 1.1);
    fin.scale.set(0.9, 1.0, 0.15);
    pecGroup.add(fin);
  }
  tagGroup(pecGroup);
  root.add(pecGroup);

  // ── 8. Pelvic & Anal Fins — bottom stabilizing fins ───────────────
  const pelGroup = namedGroup('part_pelvic-anal-fins');
  const pel = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.30, 4), phys(0xf97316));
  pel.position.set(0.05, -0.44, 0);
  pel.rotation.set(Math.PI, 0, -0.45);
  pel.scale.set(1.0, 1.0, 0.14);
  const anal = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 4), phys(0xf97316));
  anal.position.set(-0.42, -0.34, 0);
  anal.rotation.set(Math.PI, 0, -0.55);
  anal.scale.set(1.0, 1.0, 0.14);
  pelGroup.add(pel, anal);
  tagGroup(pelGroup);
  root.add(pelGroup);

  // ── 9. Tail Fin (Caudal Fin) — forked propulsion fin ──────────────
  const tailGroup = namedGroup('part_tail-fin');
  const tailMat = phys(0xfb923c, { roughness: 0.4 });
  const tTop = new THREE.Mesh(new THREE.ConeGeometry(0.20, 0.56, 4), tailMat);
  tTop.position.set(-0.96, 0.16, 0);
  tTop.rotation.set(0, 0, -1.05);
  tTop.scale.set(0.9, 1.0, 0.12);
  const tBot = new THREE.Mesh(new THREE.ConeGeometry(0.20, 0.56, 4), tailMat.clone());
  tBot.position.set(-0.96, -0.16, 0);
  tBot.rotation.set(0, 0, -2.09);
  tBot.scale.set(0.9, 1.0, 0.12);
  tailGroup.add(tTop, tBot);
  tagGroup(tailGroup);
  root.add(tailGroup);

  // ── 10. Lateral Line (NEET) — sensory vibration line along sides ──
  const llGroup = namedGroup('part_lateral-line');
  for (const zSign of [1, -1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.45, 0.08, zSign * 0.24),
      new THREE.Vector3(0.05, 0.08, zSign * 0.28),
      new THREE.Vector3(-0.40, 0.03, zSign * 0.22),
      new THREE.Vector3(-0.72, 0.00, zSign * 0.08),
    ]);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 20, 0.015, 8, false),
      phys(0xfde047, { roughness: 0.2 })
    );
    llGroup.add(tube);
  }
  tagGroup(llGroup);
  root.add(llGroup);

  // ── 11. Swim Bladder (NEET) — silvery air sac for buoyancy ────────
  addMesh(root, 'part_swim-bladder',
    new THREE.CapsuleGeometry(0.12, 0.34, 8, 16),
    phys(0xe2e8f0, { roughness: 0.2, metalness: 0.2 }),
    [-0.02, 0.12, 0],
    [0, 0, Math.PI / 2]
  );

  return root;
}

export const FISH_COLORS = {
  'body':             0x38bdf8,
  'head-mouth':       0x0284c7,
  'eye':              0xfacc15,
  'operculum':        0x7dd3fc,
  'gills':            0xef4444,
  'dorsal-fin':       0xfb923c,
  'pectoral-fin':     0xfdba74,
  'pelvic-anal-fins': 0xf97316,
  'tail-fin':         0xfb923c,
  'lateral-line':     0xfde047,
  'swim-bladder':     0xe2e8f0,
};

