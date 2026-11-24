/**
 * label.js — Label mode controller.
 *
 * Shows numbered CSS2D pins at each part's anchor position.
 * Student taps a pin → selects it, then taps a label chip → assigns label.
 * Instant right/wrong feedback. Final score saved to progress store.
 */

import { filterParts } from '../data/content.js';
import { saveLabelScore } from '../store/progress.js';
import { t } from '../i18n/t.js';

export class LabelMode {
  constructor(ctx) {
    this.ctx = ctx;
    this._selectedPinPartId = null;
    this._correct = new Set();
    this._attempted = new Set();
    this._parts = [];
    this._onPointerUp = this._onPointerUp.bind(this);
  }

  activate() {
    const { labelUi, labelRendererEl, topicData, levelFn } = this.ctx;
    this._parts = filterParts(topicData.parts, levelFn());
    this._correct.clear();
    this._attempted.clear();
    this._selectedPinPartId = null;

    if (this._parts.length === 0) {
      this.ctx.toast.show(t('ui.noPinsAvailable'));
      return;
    }

    // Show label UI
    if (labelUi) labelUi.hidden = false;

    // Create pins
    const { pinManager, requestRender } = this.ctx;
    pinManager.createPins(this._parts, (partId) => this._onPinClick(partId));
    pinManager.enableInteraction();

    // Build label tray
    this._buildTray();
    this._updateScoreBar();

    // Also listen for canvas taps for tap-to-assign in quiz-tap-part style
    this.ctx.picker.canvas.addEventListener('pointerup', this._onPointerUp);

    requestRender();
  }

  deactivate() {
    const { pinManager, labelUi, requestRender } = this.ctx;
    pinManager.clear();
    if (labelUi) labelUi.hidden = true;
    if (this.ctx.trayEl) this.ctx.trayEl.innerHTML = '';
    this.ctx.picker.canvas.removeEventListener('pointerup', this._onPointerUp);
    requestRender();
  }

  _onPinClick(partId) {
    if (this._correct.has(partId)) return; // already labelled correctly
    this._selectedPinPartId = partId;
    this.ctx.pinManager.setSelected(partId);
    this.ctx.requestRender();
  }

  _onPointerUp(event) {
    // If a pin is selected and user taps canvas background, deselect pin
    if (this._selectedPinPartId) {
      const hit = this.ctx.picker.pick(event);
      if (!hit) {
        this._selectedPinPartId = null;
        this.ctx.pinManager.setSelected(null);
        this.ctx.requestRender();
      }
    }
  }

  _buildTray() {
    const { trayEl } = this.ctx;
    if (!trayEl) return;
    trayEl.innerHTML = '';

    // Shuffle labels
    const labels = [...this._parts].sort(() => Math.random() - 0.5);

    for (const part of labels) {
      if (this._correct.has(part.id)) continue;
      const chip = document.createElement('button');
      chip.className = 'label-chip';
      chip.textContent = this.ctx.tl(part.name);
      chip.dataset.partId = part.id;
      chip.addEventListener('click', () => this._onChipClick(part.id));
      trayEl.appendChild(chip);
    }
  }

  _onChipClick(labelPartId) {
    if (!this._selectedPinPartId) {
      this.ctx.toast.show(t('ui.selectPinFirst'));
      return;
    }

    const isCorrect = labelPartId === this._selectedPinPartId;
    this._attempted.add(this._selectedPinPartId);

    if (isCorrect) {
      this.ctx.pinManager.setCorrect(this._selectedPinPartId);
      this._correct.add(this._selectedPinPartId);
      this.ctx.toast.show('✓ Correct!');
      this._selectedPinPartId = null;

      // Remove chip from tray
      const chip = this.ctx.trayEl.querySelector(`[data-part-id="${labelPartId}"]`);
      chip?.remove();
    } else {
      this.ctx.pinManager.flashWrong(this._selectedPinPartId);
      this.ctx.toast.show('✗ Not quite — try another label');
    }

    this._updateScoreBar();
    this.ctx.requestRender();

    // Auto-finish when all correct
    if (this._correct.size === this._parts.length) {
      setTimeout(() => this._finish(), 600);
    }
  }

  _updateScoreBar() {
    const { scoreTextEl } = this.ctx;
    if (!scoreTextEl) return;
    const done = this._correct.size;
    const total = this._parts.length;
    scoreTextEl.textContent = `${done} / ${total} labelled`;
  }

  _finish() {
    const score = this._correct.size / this._parts.length;
    saveLabelScore(this.ctx.topicData.id, this.ctx.levelFn(), score);
    const pct = Math.round(score * 100);
    this.ctx.toast.show(`Label mode complete! Score: ${pct}%`, 4000);
  }

  showAnswer() {
    if (!this._selectedPinPartId) return;
    this.ctx.toast.show(this.ctx.tl(
      this._parts.find(p => p.id === this._selectedPinPartId)?.name
    ), 3000);
  }
}

