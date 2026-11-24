/**
 * helpers.js — Shared Three.js geometry/material helpers for procedural models.
 */

import * as THREE from 'three';

/** Shorthand for MeshStandardMaterial (GLTFExporter-compatible PBR) */
export function phys(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness:   opts.roughness   ?? 0.55,
    metalness:   opts.metalness   ?? 0.05,
    transparent: opts.transparent ?? false,
    opacity:     opts.opacity     ?? 1,
    side:        opts.side        ?? THREE.FrontSide,
    depthWrite:  opts.depthWrite  ?? true,
  });
}

/** Add a single mesh to a parent group and tag it with userData.meshName */
export function addMesh(group, name, geometry, material, pos, rot, scale) {
  const m = new THREE.Mesh(geometry, material);
  m.name = name;
  m.userData.meshName = name;
  if (pos) m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  if (scale) m.scale.set(...scale);
  group.add(m);
  return m;
}

/** Create a named group */
export function namedGroup(name) {
  const g = new THREE.Group();
  g.name = name;
  return g;
}

/** Propagate group.name as userData.meshName onto all child meshes */
export function tagGroup(group) {
  const meshName = group.name;
  group.traverse(obj => {
    if (obj !== group && (obj.isMesh || obj.isLine)) {
      obj.userData.meshName = meshName;
    }
  });
}

