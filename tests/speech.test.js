import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSpeech } from '../src/background/speech.js';

const local = { voiceName: 'Test English', lang: 'en-US', remote: false };

test('speech reports asynchronous engine errors and completes on end', async () => {
  let fail = false;
  const speech = createSpeech({
    getVoices(callback) { callback([local]); },
    speak(word, options, callback) {
      assert.equal(word, 'hello'); assert.equal(options.voiceName, local.voiceName);
      callback(); queueMicrotask(() => options.onEvent({ type: fail ? 'error' : 'end' }));
    },
  }, {});
  assert.deepEqual(await speech.speak('hello', '1:0', 'a'), { available: true });
  fail = true; await assert.rejects(speech.speak('hello', '1:0', 'b'), /unavailable/);
});

test('closing popup before voices resolve prevents late audio', async () => {
  let ready;
  const speech = createSpeech({
    getVoices(callback) { ready = callback; },
    speak() { assert.fail('closed popup must not start audio'); },
  }, {});
  const pending = speech.speak('hello', '1:0', 'a');
  speech.stop('1:0', 'a'); ready([local]);
  assert.deepEqual(await pending, { available: false });
});

test('closing a different tab does not stop current speech', async () => {
  let complete;
  let stops = 0;
  const speech = createSpeech({
    getVoices(callback) { callback([local]); },
    speak(word, options, callback) { complete = options.onEvent; callback(); },
    stop() { stops++; complete({ type: 'interrupted' }); },
  }, {});
  const pending = speech.speak('hello', '1:0', 'a');
  await Promise.resolve();
  speech.stop('2:0', 'a'); assert.equal(stops, 0);
  speech.stop('1:0', 'a'); assert.equal(stops, 1);
  await pending;
});
