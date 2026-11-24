/**
 * panel.js — Info panel: shows part name, description, step counter, and Prev/Next tour controls.
 * On mobile: a bottom sheet. On desktop: a sidebar section.
 * Both are updated simultaneously; CSS hides the wrong one per breakpoint.
 */

export class InfoPanel {
  constructor(els) {
    this.mobile = els.mobileEl;
    this.nameEls = [els.nameElsMobile, els.nameElsDesktop];
    this.descEls = [els.descElsMobile, els.descElsDesktop];
    this.detailEls = [els.detailElsMobile, els.detailElsDesktop];
    this.dotEls = [els.dotElMobile, els.dotElDesktop].filter(Boolean);
    this.stepEls = [els.stepElMobile, els.stepElDesktop].filter(Boolean);
    this.desktopPanel = els.desktopPanelEl;
    this._onPrev = null;
    this._onNext = null;

    // Close button (mobile)
    const closeBtn = this.mobile.querySelector('#info-close');
    closeBtn?.addEventListener('click', () => this.hide());

    // Prev / Next buttons (mobile + desktop)
    [els.prevElMobile, els.prevElDesktop].forEach(btn => {
      btn?.addEventListener('click', () => this._onPrev?.());
    });
    [els.nextElMobile, els.nextElDesktop].forEach(btn => {
      btn?.addEventListener('click', () => this._onNext?.());
    });
  }

  setNavigationHandlers({ onPrev, onNext }) {
    this._onPrev = onPrev;
    this._onNext = onNext;
  }

  /**
   * @param {object} part   Topic part object from JSON
   * @param {'basic'|'neet'} level
   * @param {function} tl   Locale translation helper
   * @param {object} [meta] { index, total, colorHex }
   */
  show(part, level, tl, meta = {}) {
    const name   = tl(part.name);
    const desc   = tl(part.short);
    const detail = level === 'neet' && part.detail ? tl(part.detail) : null;

    for (const el of this.nameEls)   el.textContent = name;
    for (const el of this.descEls)   el.textContent = desc;
    for (const el of this.detailEls) {
      if (detail) {
        el.textContent = detail;
        el.hidden = false;
      } else {
        el.hidden = true;
      }
    }

    if (meta.colorHex != null) {
      const hex = `#${meta.colorHex.toString(16).padStart(6, '0')}`;
      for (const dot of this.dotEls) dot.style.background = hex;
    }

    const stepText = meta.total
      ? `Part ${(meta.index ?? 0) + 1} of ${meta.total}`
      : '';
    for (const el of this.stepEls) el.textContent = stepText;

    this.mobile.classList.add('visible');
    if (this.desktopPanel) this.desktopPanel.hidden = false;
  }

  hide() {
    this.mobile.classList.remove('visible');
    if (this.desktopPanel) this.desktopPanel.hidden = true;
  }
}
