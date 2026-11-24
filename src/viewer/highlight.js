/**
 * highlight.js — Material state manager.
 * Selected part: emissive glow.
 * All others: dimmed (low opacity).
 * Deselect: restores all original materials.
 *
 * Materials are cloned on first modification so originals are never mutated.
 */

export class Highlighter {
  constructor() {
    this._saved = new Map(); // mesh → original material
  }

  /**
   * @param {THREE.Object3D[]} selectedMeshes  Meshes to highlight
   * @param {THREE.Object3D[]} allMeshes       Every mesh in the scene
   */
  select(selectedMeshes, allMeshes) {
    this.restore();

    const selSet = new Set(selectedMeshes);

    for (const mesh of allMeshes) {
      const isSelected = selSet.has(mesh);
      this._clone(mesh);

      const mat = mesh.material;
      if (!mat) continue;

      if (isSelected) {
        if (mat.emissive) {
          mat.emissive.setHex(0x164e63);
          mat.emissiveIntensity = 0.55;
        }
        if (mat.opacity < 0.45) {
          mat.opacity = 0.65;
        }
      } else {
        mat.transparent = true;
        mat.opacity = Math.min(mat.opacity, 0.22);
        if (mat.emissive) mat.emissiveIntensity = 0;
      }
    }
  }

  /** Restore all materials to originals */
  restore() {
    for (const [mesh, original] of this._saved) {
      if (mesh.material && mesh.material !== original) {
        mesh.material.dispose();
      }
      mesh.material = original;
    }
    this._saved.clear();
  }

  _clone(mesh) {
    if (!this._saved.has(mesh)) {
      const original = mesh.material;
      mesh.material = mesh.material.clone();
      this._saved.set(mesh, original);
    }
  }
}

