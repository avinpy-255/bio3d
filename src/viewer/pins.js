/**
 * pins.js — CSS2DObject pins for Label mode.
 * Each pin is an HTML <div> placed at a 3D anchor point.
 */

import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export class PinManager {
  /**
   * @param {THREE.Scene} scene
   * @param {HTMLElement} labelRendererEl  The CSS2DRenderer domElement
   */
  constructor(scene, labelRendererEl) {
    this.scene = scene;
    this.labelRendererEl = labelRendererEl;
    this.pins = []; // [{ object, partId, number, el }]
  }

  /**
   * Create numbered pins for each part.
   * @param {object[]} parts  Filtered parts array
   * @param {function} onPinClick  Called with (partId, pinNumber)
   */
  createPins(parts, onPinClick) {
    this.clear();

    parts.forEach((part, i) => {
      const el = document.createElement('div');
      el.className = 'pin';
      el.textContent = i + 1;
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', `Pin ${i + 1} — tap to select`);

      const handler = (e) => {
        e.stopPropagation();
        onPinClick(part.id, i + 1);
      };
      el.addEventListener('click', handler);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') handler(e);
      });

      const obj = new CSS2DObject(el);
      obj.position.set(...(part.anchor ?? [0, 0, 0]));
      this.scene.add(obj);

      this.pins.push({ object: obj, partId: part.id, number: i + 1, el });
    });
  }

  /** Enable click events on pins */
  enableInteraction() {
    this.labelRendererEl.style.pointerEvents = 'auto';
  }

  /** Disable click events (explore / quiz mode) */
  disableInteraction() {
    this.labelRendererEl.style.pointerEvents = 'none';
  }

  setSelected(partId) {
    for (const pin of this.pins) {
      pin.el.classList.toggle('selected', pin.partId === partId);
    }
  }

  setCorrect(partId) {
    const pin = this.pins.find(p => p.partId === partId);
    if (pin) {
      pin.el.classList.remove('selected', 'wrong');
      pin.el.classList.add('correct');
    }
  }

  flashWrong(partId) {
    const pin = this.pins.find(p => p.partId === partId);
    if (!pin) return;
    pin.el.classList.add('wrong');
    setTimeout(() => pin.el.classList.remove('wrong'), 600);
  }

  clear() {
    for (const pin of this.pins) {
      this.scene.remove(pin.object);
    }
    this.pins = [];
    this.disableInteraction();
  }

  get count() { return this.pins.length; }

  getPinForPart(partId) {
    return this.pins.find(p => p.partId === partId);
  }
}

