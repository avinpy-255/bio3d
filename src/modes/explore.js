/**
 * explore.js — Explore mode controller.
 * Tap a part → highlight it, fly camera to frame it, and show info panel.
 * Supports Guided Tour (Prev / Next stepping + keyboard Left/Right arrows).
 */

import * as THREE from 'three';
import { findPartByMesh, filterParts } from '../data/content.js';
import { flyCamera } from '../viewer/scene.js';

export class ExploreMode {
  constructor(ctx) {
    this.ctx = ctx;
    this._selectedPartId = null;
    this._downPos = null;
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);

    ctx.panel.setNavigationHandlers({
      onPrev: () => this.step(-1),
      onNext: () => this.step(1),
    });
  }

  activate() {
    const { picker } = this.ctx;
    picker.canvas.addEventListener('pointerdown', this._onPointerDown);
    picker.canvas.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('keydown', this._onKeyDown);
    this._buildPartsList();
  }

  deactivate() {
    const { picker, highlighter, panel, requestRender } = this.ctx;
    picker.canvas.removeEventListener('pointerdown', this._onPointerDown);
    picker.canvas.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('keydown', this._onKeyDown);
    highlighter.restore();
    panel.hide();
    this._selectedPartId = null;
    this._clearPartsList();
    requestRender();
  }

  startTour() {
    const parts = filterParts(this.ctx.topicData.parts, this.ctx.levelFn());
    if (!parts.length) return;
    this.selectPart(parts[0].id, { fly: true });
  }

  step(delta) {
    const parts = filterParts(this.ctx.topicData.parts, this.ctx.levelFn());
    if (!parts.length) return;
    const curIdx = parts.findIndex(p => p.id === this._selectedPartId);
    const nextIdx = curIdx === -1
      ? 0
      : (curIdx + delta + parts.length) % parts.length;
    this.selectPart(parts[nextIdx].id, { fly: true });
  }

  _onKeyDown(e) {
    if (!this._selectedPartId) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowRight') this.step(1);
    else if (e.key === 'ArrowLeft') this.step(-1);
  }

  _onPointerDown(event) {
    this._downPos = { x: event.clientX, y: event.clientY };
  }

  _onPointerUp(event) {
    // Ignore if pointer moved significantly (user was rotating/panning)
    if (this._downPos) {
      const dx = event.clientX - this._downPos.x;
      const dy = event.clientY - this._downPos.y;
      if (Math.hypot(dx, dy) > 6) return;
    }

    const { picker, highlighter, panel, topicData, levelFn, requestRender } = this.ctx;
    const hit = picker.pick(event);

    if (!hit) {
      highlighter.restore();
      panel.hide();
      this._selectedPartId = null;
      this._syncList();
      requestRender();
      return;
    }

    const part = findPartByMesh(hit.meshName, topicData.parts, levelFn());
    if (!part) return;

    this.selectPart(part.id, { fly: true });
  }

  selectPart(partId, { fly = true } = {}) {
    const { highlighter, panel, topicData, levelFn, allMeshes, requestRender, tl, partColors } = this.ctx;
    const parts = filterParts(topicData.parts, levelFn());
    const idx = parts.findIndex(p => p.id === partId);
    const part = parts[idx];
    if (!part) return;

    const partMeshNames = new Set(part.meshNames);
    const partMeshes = allMeshes.filter(m => partMeshNames.has(m.userData.meshName ?? m.name));

    highlighter.select(partMeshes, allMeshes);

    const colorHex = this._resolvePartColor(part, partColors, partMeshes);
    panel.show(part, levelFn(), tl, {
      index: idx,
      total: parts.length,
      colorHex,
    });

    this._selectedPartId = partId;
    this._syncList();

    if (fly) this._focusPartCamera(part, partMeshes);
    requestRender();
  }

  _focusPartCamera(part, partMeshes) {
    const { camera, controls, topicData, requestRender } = this.ctx;
    if (!camera || !controls) return;

    // Determine target point from live mesh bounding box (handles explode offsets too!)
    const box = new THREE.Box3();
    for (const m of partMeshes) box.expandByObject(m);

    const targetVec = !box.isEmpty()
      ? box.getCenter(new THREE.Vector3())
      : new THREE.Vector3(...(part.anchor ?? [0, 0, 0]));

    // Keep camera looking from current viewing direction, framed comfortably
    const viewDir = camera.position.clone().sub(controls.target).normalize();
    if (viewDir.lengthSq() < 0.01) viewDir.set(0, 0, 1);

    const minDist = topicData.camera?.minDistance ?? 1.5;
    const maxDist = topicData.camera?.maxDistance ?? 8;
    const currentDist = camera.position.distanceTo(controls.target);
    const desiredDist = Math.max(minDist + 0.6, Math.min(maxDist * 0.72, currentDist));

    const newPos = targetVec.clone().addScaledVector(viewDir, desiredDist);

    flyCamera(
      camera,
      controls,
      [newPos.x, newPos.y, newPos.z],
      [targetVec.x, targetVec.y, targetVec.z],
      requestRender,
      550
    );
  }

  _resolvePartColor(part, partColors, partMeshes) {
    if (partColors?.[part.id] != null) return partColors[part.id];
    const match = partMeshes?.[0] ?? this.ctx.allMeshes?.find(
      m => new Set(part.meshNames).has(m.userData.meshName ?? m.name)
    );
    return match?.material?.color?.getHex?.() ?? 0x22d3ee;
  }

  _buildPartsList() {
    const { partsList, topicData, levelFn, partColors } = this.ctx;
    if (!partsList) return;

    const parts = filterParts(topicData.parts, levelFn());
    partsList.innerHTML = '';

    for (const part of parts) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = 'parts-list-item';
      btn.dataset.partId = part.id;

      const dot = document.createElement('span');
      dot.className = 'part-dot';
      const color = this._resolvePartColor(part, partColors);
      if (color != null) dot.style.background = `#${color.toString(16).padStart(6, '0')}`;

      const label = document.createElement('span');
      label.textContent = this.ctx.tl(part.name);

      btn.appendChild(dot);
      btn.appendChild(label);

      if (part.level === 'neet') {
        const badge = document.createElement('span');
        badge.className = 'badge-neet';
        badge.textContent = 'NEET';
        btn.appendChild(badge);
      }

      btn.addEventListener('click', () => this.selectPart(part.id, { fly: true }));
      li.appendChild(btn);
      partsList.appendChild(li);
    }
  }

  _clearPartsList() {
    if (this.ctx.partsList) this.ctx.partsList.innerHTML = '';
  }

  _syncList() {
    if (!this.ctx.partsList) return;
    this.ctx.partsList.querySelectorAll('.parts-list-item').forEach(btn => {
      const isSelected = btn.dataset.partId === this._selectedPartId;
      btn.classList.toggle('selected', isSelected);
      if (isSelected) btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }
}
