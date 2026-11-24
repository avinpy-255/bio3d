/**
 * animator.js — Living biological animations + Explode View controller.
 *
 * Keeps base positions cleanly separated from explode offsets and animation
 * displacements so rotating, exploding, and animating never fight each other.
 */

import * as THREE from 'three';

export class ModelAnimator {
  /**
   * @param {string} topicId
   * @param {THREE.Group} group
   */
  constructor(topicId, group) {
    this.topicId = topicId;
    this.group = group;
    this._animating = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._explodeTarget = 0;
    this._explodeCurrent = 0;
    this._time = 0;
    this._parts = []; // [{ obj, meshName, basePos, baseScale, baseRot, explodeVec, phase }]

    this._indexTopLevelParts();
  }

  _indexTopLevelParts() {
    // Collect direct part_* nodes (or one level down if wrapped in a single root group)
    const rootChildren =
      this.group.children.length === 1 && !this.group.children[0].name.startsWith('part_')
        ? this.group.children[0].children
        : this.group.children;

    const modelBox = new THREE.Box3().setFromObject(this.group);
    const modelCenter = modelBox.getCenter(new THREE.Vector3());

    rootChildren.forEach((obj, idx) => {
      const meshName = obj.userData.meshName ?? obj.name ?? '';
      const basePos = obj.position.clone();
      const baseScale = obj.scale.clone();
      const baseRot = obj.rotation.clone();

      // Compute radial direction from model center to this part's world bbox center
      const partBox = new THREE.Box3().setFromObject(obj);
      const partCenter = partBox.isEmpty()
        ? obj.position.clone()
        : partBox.getCenter(new THREE.Vector3());

      const dir = partCenter.clone().sub(modelCenter);

      // Special cases: outer shells / core parts so explode looks deliberate and readable
      if (meshName === 'part_cell-membrane' || meshName === 'part_membrane' || meshName === 'part_capsule') {
        dir.set(0, 0, -0.95);
      } else if (meshName === 'part_cytoplasm') {
        dir.set(0, -0.85, 0);
      } else if (meshName === 'part_cell-wall') {
        dir.set(0, 0, -0.9);
      } else if (meshName === 'part_ribosomes') {
        dir.set(0, 0.5, 0.55);
      } else if (meshName === 'part_er_rough') {
        dir.set(-0.65, 0.1, 0.25);
      } else if (meshName === 'part_er_smooth') {
        dir.set(-0.2, -0.55, 0.45);
      } else if (meshName === 'part_nuclear_envelope') {
        dir.set(0, 0.35, -0.35);
      } else if (meshName === 'part_nucleus' || meshName === 'part_septum' || meshName === 'part_nucleoid') {
        dir.set(0, 0, 0);
      } else if (dir.lengthSq() < 0.01) {
        // Fallback radial direction if centered near (0,0,0)
        const angle = (idx / Math.max(rootChildren.length, 1)) * Math.PI * 2;
        dir.set(Math.cos(angle) * 0.6, Math.sin(angle) * 0.6, 0.25);
      } else {
        dir.normalize().multiplyScalar(0.95);
      }

      this._parts.push({
        obj,
        meshName,
        basePos,
        baseScale,
        baseRot,
        explodeVec: dir,
        phase: idx * 0.85,
      });
    });
  }

  get animating() { return this._animating; }
  setAnimating(enabled) {
    this._animating = enabled;
    if (!enabled) this._applyTransforms(0, true);
  }

  get explode() { return this._explodeTarget; }
  setExplode(fraction) {
    this._explodeTarget = Math.max(0, Math.min(1, fraction));
  }

  /** Called every frame by scene.js renderLoop */
  update(dt) {
    const clampedDt = Math.min(dt, 0.05);
    this._time += clampedDt;

    // Smoothly approach explode target
    const diff = this._explodeTarget - this._explodeCurrent;
    if (Math.abs(diff) > 0.001) {
      this._explodeCurrent += diff * Math.min(1, clampedDt * 10);
    } else {
      this._explodeCurrent = this._explodeTarget;
    }

    this._applyTransforms(this._time, !this._animating);
  }

  _applyTransforms(t, staticOnly) {
    for (const p of this._parts) {
      // 1. Base + Explode offset
      p.obj.position.copy(p.basePos).addScaledVector(p.explodeVec, this._explodeCurrent);
      p.obj.scale.copy(p.baseScale);
      p.obj.rotation.copy(p.baseRot);

      if (staticOnly) continue;

      const name = p.meshName;

      // 2. Topic-specific living animations
      if (this.topicId === 'human-heart') {
        // Lub-dub double heartbeat pulse (~72 bpm => ~1.2 Hz)
        const cycle = (t * 1.2) % 1;
        const atrialPulse = Math.exp(-Math.pow((cycle - 0.12) / 0.06, 2));
        const ventPulse = Math.exp(-Math.pow((cycle - 0.28) / 0.07, 2));

        if (name.includes('atrium')) {
          const s = 1 - atrialPulse * 0.07;
          p.obj.scale.multiplyScalar(s);
        } else if (name.includes('ventricle') || name === 'part_coronary-arteries') {
          const s = 1 + ventPulse * 0.065;
          p.obj.scale.multiplyScalar(s);
        } else if (name === 'part_aorta' || name === 'part_pulmonary-artery') {
          const s = 1 + ventPulse * 0.035;
          p.obj.scale.multiplyScalar(s);
        } else if (name === 'part_sa-node') {
          const s = 1 + atrialPulse * 0.25;
          p.obj.scale.multiplyScalar(s);
        }
      } else if (this.topicId === 'fish') {
        if (name === 'part_tail-fin') {
          p.obj.rotation.y += Math.sin(t * 4.5) * 0.22;
        } else if (name === 'part_pectoral-fin') {
          p.obj.rotation.y += Math.sin(t * 3.5 + 0.6) * 0.14;
        } else {
          p.obj.position.y += Math.sin(t * 2.0) * 0.025;
        }
      } else if (this.topicId === 'bacteria') {
        if (name === 'part_flagellum') {
          p.obj.rotation.x += Math.sin(t * 5.0) * 0.12;
          p.obj.rotation.y += Math.cos(t * 5.0) * 0.08;
        } else if (name === 'part_nucleoid' || name === 'part_plasmid' || name === 'part_ribosomes') {
          p.obj.position.y += Math.sin(t * 1.6 + p.phase) * 0.015;
        }
      } else if (this.topicId === 'flower') {
        if (name === 'part_petals' || name === 'part_anther' || name === 'part_filament') {
          p.obj.rotation.z += Math.sin(t * 1.4 + p.phase) * 0.03;
        }
      } else if (this.topicId === 'leaf') {
        if (name === 'part_air-spaces') {
          const s = 1 + Math.sin(t * 2.0 + p.phase) * 0.1;
          p.obj.scale.multiplyScalar(s);
        } else if (name === 'part_stomata') {
          const s = 1 + Math.sin(t * 1.5) * 0.08;
          p.obj.scale.x *= s;
        }
      } else {
        // Animal cell & Plant cell: subtle living organelle float + flagellum wave
        if (name === 'part_cilia-flagella') {
          p.obj.rotation.z += Math.sin(t * 3.8) * 0.06;
        } else if (
          name !== 'part_cell-membrane' &&
          name !== 'part_membrane' &&
          name !== 'part_cell-wall' &&
          name !== 'part_cytoplasm'
        ) {
          p.obj.position.y += Math.sin(t * 1.4 + p.phase) * 0.018;
        }
      }
    }
  }
}

