import { HoverState } from './hover-state.js';
import { wordAtPoint, sameTarget } from './word-at-point.js';
import { TranslationPopup } from './popup.js';
import { LEAVE_DELAY_MS } from '../shared/config.js';

let pointer = null;
let active = null;
let leaveTimer = null;
let pointerFrame = null;

async function send(type, request = active) {
  if (!request) return { ok: false };
  try {
    return await chrome.runtime.sendMessage({ type, word: request.word, requestId: request.id });
  } catch {
    return { requestId: request.id, ok: false, error: { code: 'UNAVAILABLE' } };
  }
}

function cancelActive() {
  if (active) {
    void send('CANCEL');
    void send('STOP_SPEECH');
  }
  active = null;
  popup.hide();
  clearTimeout(leaveTimer);
  leaveTimer = null;
}

const state = new HoverState({
  activate(point) {
    // Recheck live DOM/coordinates after the dwell, including when a page changed without mouse movement.
    const fresh = pointer && wordAtPoint(pointer.x, pointer.y);
    if (!sameTarget(point, fresh)) { state.dismiss(); return; }
    cancelActive();
    const request = { id: crypto.randomUUID(), word: fresh.word, point: fresh };
    active = request;
    popup.show(fresh);
    const current = response => active === request && response?.requestId === request.id && popup.visible;
    void send('TRANSLATE', request).then(async response => {
      if (!current(response)) return;
      popup.result(response);
      if (response.ok) {
        const examples = await send('EXAMPLES', request);
        if (current(examples)) popup.setExamples(examples);
      }
    });
    void send('VOICE_STATUS', request).then(response => { if (current(response)) popup.setVoice(response); });
  },
  invalidate: cancelActive,
});

const popup = new TranslationPopup({
  close: () => state.dismiss(),
  speak: async () => {
    const request = active;
    popup.speakButton.disabled = true;
    const response = await send('SPEAK', request);
    if (active === request) popup.setVoice(response);
  },
});

function pointerUpdate() {
  pointerFrame = null;
  if (!pointer) return;
  const insidePopup = popup.hit(pointer.x, pointer.y);
  if (insidePopup) {
    state.move(null);
    clearTimeout(leaveTimer);
    leaveTimer = null;
    return;
  }
  const point = (state.ctrl || active) ? wordAtPoint(pointer.x, pointer.y) : null;
  state.move(point);
  if (active && !sameTarget(point, active.point)) {
    if (leaveTimer === null) leaveTimer = setTimeout(() => {
      leaveTimer = null;
      // Keep a newly armed dwell while retiring the old popup.
      cancelActive();
      state.current = null;
    }, LEAVE_DELAY_MS);
  } else {
    clearTimeout(leaveTimer);
    leaveTimer = null;
  }
}

document.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse') return;
  pointer = { x: event.clientX, y: event.clientY };
  // Record native modifiers too, e.g. Ctrl was already down when entering the tab.
  if (!popup.contains(event)) state.control(event.ctrlKey, event.ctrlKey ? wordAtPoint(pointer.x, pointer.y) : null);
  if (pointerFrame === null) pointerFrame = requestAnimationFrame(pointerUpdate);
}, { passive: true, capture: true });

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { state.dismiss(); return; }
  if (event.key === 'Control') {
    if (!event.repeat && !popup.contains(event)) state.control(true, pointer && wordAtPoint(pointer.x, pointer.y));
  } else if (event.ctrlKey && (event.key.length === 1
    || ['Tab', 'Enter', 'Backspace', 'Delete', 'Home', 'End', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key))) {
    state.dismiss();
  }
}, true);
document.addEventListener('keyup', event => {
  if (event.key === 'Control') state.control(event.ctrlKey, null);
}, true);
document.addEventListener('pointerdown', event => {
  pointer = { x: event.clientX, y: event.clientY };
  if (!popup.contains(event)) state.dismiss();
}, true);
document.addEventListener('contextmenu', () => state.dismiss(), true);
document.addEventListener('scroll', event => { if (!popup.contains(event)) state.dismiss(); }, true);
window.addEventListener('resize', () => state.dismiss());
window.addEventListener('blur', () => { pointer = null; state.dismiss({ resetControl: true }); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { pointer = null; state.dismiss({ resetControl: true }); }
});
document.addEventListener('pointerout', event => {
  if (!event.relatedTarget) { pointer = null; state.dismiss({ resetControl: true }); }
}, true);
