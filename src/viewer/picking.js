/**
 * picking.js — Raycasting: maps a pointer event to a mesh name.
 *
 * Smart shell handling: when translucent outer shells (like plasma membrane or
 * nuclear envelope) enclose solid organelles, raycast prefers solid hits first,
 * then higher-opacity inner shells, and only hits the outer translucent shell
 * when nothing solid sits behind the tap point.
 */

import * as THREE from 'three';

export class Picker {
  /**
   * @param {THREE.Camera} camera
   * @param {HTMLCanvasElement} canvas
   * @param {THREE.Object3D[]} pickables  Meshes that can be hit
   */
  constructor(camera, canvas, pickables = []) {
    this.camera = camera;
    this.canvas = canvas;
    this.pickables = pickables;
    this._raycaster = new THREE.Raycaster();
    this._raycaster.params.Line.threshold = 0.05;
  }

  /**
   * Cast a ray from the pointer event into the scene.
   * @param {PointerEvent} event
   * @returns {{ mesh: THREE.Object3D, meshName: string } | null}
   */
  pick(event) {
    if (!this.pickables.length) return null;

    const rect = this.canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this._raycaster.setFromCamera({ x, y }, this.camera);
    const hits = this._raycaster.intersectObjects(this.pickables, false);

    if (!hits.length) return null;

    // Prefer the closest opaque/solid hit so translucent outer membranes don't block organelles
    const solidHit = hits.find(h => {
      const m = h.object.material;
      return !m || !m.transparent || (m.opacity ?? 1) >= 0.85;
    });

    // If only transparent shells were hit, pick the most opaque inner shell (e.g. nucleus > envelope > membrane)
    const chosen = solidHit ?? [...hits].sort(
      (a, b) => (b.object.material?.opacity ?? 1) - (a.object.material?.opacity ?? 1)
    )[0];

    const mesh = chosen.object;
    const meshName = mesh.userData.meshName ?? mesh.name;
    return { mesh, meshName };
  }

  updatePickables(pickables) {
    this.pickables = pickables;
  }
}
