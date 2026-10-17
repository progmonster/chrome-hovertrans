import { HOVER_DELAY_MS, POINTER_TOLERANCE_PX } from '../shared/config.js';
import { sameTarget } from './word-at-point.js';

// Timers and mouse input are injected, so dwell/cancellation tests use a deterministic clock.
export class HoverState {
  constructor({ activate, invalidate = () => {}, schedule = (fn, ms) => setTimeout(fn, ms), unschedule = id => clearTimeout(id) }) {
    Object.assign(this, { activate, invalidate, schedule, unschedule });
    this.ctrl = false;
    this.target = null;
    this.current = null;
    this.timer = null;
    this.blocked = null;
  }

  clearTimer() {
    if (this.timer !== null) this.unschedule(this.timer);
    this.timer = null;
  }

  control(down, point) {
    if (down === this.ctrl) return;
    this.ctrl = down;
    this.clearTimer();
    if (down) {
      this.blocked = null;
      this.target = null;
      this.move(point);
    }
  }

  move(point) {
    if (!this.ctrl) return;
    if (sameTarget(point, this.current) || sameTarget(point, this.blocked)) {
      this.clearTimer();
      this.target = null;
      return;
    }
    if (!sameTarget(point, this.target)
      || (point && Math.hypot(point.x - this.target.x, point.y - this.target.y) > POINTER_TOLERANCE_PX)) {
      this.clearTimer();
      this.target = point;
      if (!point) return;
      this.blocked = null;
      this.timer = this.schedule(() => {
        this.timer = null;
        this.current = point;
        this.target = null;
        this.activate(point);
      }, HOVER_DELAY_MS);
    }
  }

  dismiss({ resetControl = false } = {}) {
    this.clearTimer();
    this.blocked = this.target || this.current;
    this.current = null;
    this.target = null;
    if (resetControl) this.ctrl = false;
    this.invalidate();
  }
}
