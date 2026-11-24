/**
 * toast.js — ephemeral notification bar (auto-hides after delay).
 */

export class Toast {
  constructor(el) {
    this.el = el;
    this._timer = null;
  }

  show(msg, duration = 2000) {
    this.el.textContent = msg;
    this.el.classList.add('show');
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.hide(), duration);
  }

  hide() {
    this.el.classList.remove('show');
  }
}

