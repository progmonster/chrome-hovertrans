import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HoverState } from '../src/content/hover-state.js';

function setup() {
  let time = 0, id = 0;
  const timers = new Map();
  const calls = [];
  const state = new HoverState({
    activate: point => calls.push(point.word),
    schedule(fn, delay) { timers.set(++id, { fn, at: time + delay }); return id; },
    unschedule: key => timers.delete(key),
  });
  const tick = amount => {
    time += amount;
    for (const [key, timer] of timers) if (timer.at <= time) { timers.delete(key); timer.fn(); }
  };
  const a = { node: {}, word: 'hello', start: 0, end: 5, x: 100, y: 100 };
  const b = { ...a, node: {}, word: 'bank', end: 4, x: 200 };
  return { state, calls, tick, a, b };
}

test('no request at 499 ms; exactly one at 500 ms, key repeat does not reset', () => {
  const { state, calls, tick, a } = setup();
  state.move(a); tick(1000); assert.deepEqual(calls, []);
  state.control(true, a); tick(499); assert.deepEqual(calls, []);
  state.control(true, a); tick(1); assert.deepEqual(calls, ['hello']);
  state.move(a); tick(1000); assert.deepEqual(calls, ['hello']);
});

test('releasing Ctrl cancels dwell; releasing after activation preserves current', () => {
  const { state, calls, tick, a } = setup();
  state.control(true, a); tick(400); state.control(false); tick(1000);
  assert.deepEqual(calls, []);
  state.control(true, a); tick(500); state.control(false);
  assert.equal(state.current.word, 'hello');
});

test('jitter is measured from initial point; over 4 px resets full dwell', () => {
  const { state, calls, tick, a } = setup();
  state.control(true, a); tick(200); state.move({ ...a, x: 103 }); tick(200);
  state.move({ ...a, x: 105 }); tick(499); assert.deepEqual(calls, []);
  tick(1); assert.deepEqual(calls, ['hello']);
});

test('moving to B then back to current A cancels pending B', () => {
  const { state, calls, tick, a, b } = setup();
  state.control(true, a); tick(500); state.move(b); tick(300); state.move(a); tick(500);
  assert.deepEqual(calls, ['hello']);
});

test('Esc suppresses reopening same word until new Ctrl or another word', () => {
  const { state, calls, tick, a, b } = setup();
  state.control(true, a); tick(500); state.dismiss(); state.move(a); tick(1000);
  assert.deepEqual(calls, ['hello']);
  state.move(b); tick(500); assert.deepEqual(calls, ['hello', 'bank']);
  state.dismiss(); state.control(false); state.control(true, b); tick(500);
  assert.deepEqual(calls, ['hello', 'bank', 'bank']);
});

test('blur clears Ctrl and timers; leaving text cancels pending dwell', () => {
  const { state, calls, tick, a } = setup();
  state.control(true, a); state.dismiss({ resetControl: true }); tick(1000);
  assert.equal(state.ctrl, false); assert.deepEqual(calls, []);
  state.control(true, a); state.move(null); tick(1000); assert.deepEqual(calls, []);
});
