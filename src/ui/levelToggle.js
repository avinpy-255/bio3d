/**
 * levelToggle.js — Simple / NEET toggle.
 * Syncs state to localStorage and notifies listeners on change.
 */

import { getLevel, setLevel } from '../store/progress.js';

export class LevelToggle {
  /**
   * @param {HTMLElement} container  The .level-toggle container
   * @param {function} [onChange]    Called with new level value when it changes
   */
  constructor(container, onChange) {
    this.container = container;
    this._listeners = onChange ? [onChange] : [];
    this._value = getLevel();

    if (!container) return;

    this._buttons = Array.from(container.querySelectorAll('.level-btn'));
    this._sync();

    this._buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const newLevel = btn.dataset.level;
        if (newLevel !== this._value) {
          this._value = newLevel;
          setLevel(newLevel);
          this._sync();
          this._listeners.forEach(fn => fn(newLevel));
        }
      });
    });
  }

  get value() { return this._value; }

  onChange(fn) { this._listeners.push(fn); }

  _sync() {
    this._buttons?.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.level === this._value);
      btn.setAttribute('aria-pressed', btn.dataset.level === this._value);
    });
  }

  /** Link another LevelToggle so they stay in sync */
  link(other) {
    this.onChange(level => {
      other._value = level;
      other._sync();
    });
    other.onChange(level => {
      this._value = level;
      this._sync();
    });
  }
}

