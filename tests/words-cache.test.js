import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validWord, tokenAt, normalizeWord } from '../src/shared/words.js';
import { MemoryCache } from '../src/shared/cache.js';
import { chooseVoice } from '../src/background/speech.js';

test('English tokens allow contractions and hyphens, not numbers or mixed alphabets', () => {
  for (const word of ['hello', "don't", 'don’t', 'well-known', 'A']) assert.ok(validWord(word));
  for (const word of ['', 'a'.repeat(65), 'hello world', '<b>hello</b>', 'тест', '123', 'test123']) assert.ok(!validWord(word));
  assert.equal(tokenAt('Say hello, world!', 7).word, 'hello');
  for (const text of ['test123', '123test', 'helloмир', 'мирhello', '_hello', 'a'.repeat(65)]) {
    assert.equal(tokenAt(text, 3), null, text);
  }
  assert.equal(normalizeWord('Don’t'), "don't");
});

test('cache expires, respects provider keys and evicts least recently used', () => {
  let now = 0;
  const cache = new MemoryCache({ now: () => now, ttl: 100, limit: 2 });
  cache.set('en:ru:a', 1); cache.set('en:ru:b', 2);
  assert.equal(cache.get('en:ru:a'), 1); assert.equal(cache.get('en:de:a'), undefined);
  cache.set('en:ru:c', 3); assert.equal(cache.get('en:ru:b'), undefined);
  now = 100; assert.equal(cache.get('en:ru:a'), undefined);
});

test('speech chooses local English only, preferring US; no remote fallback', () => {
  const uk = { voiceName: 'UK', lang: 'en-GB', remote: false };
  const us = { voiceName: 'US', lang: 'en-US', remote: false };
  assert.equal(chooseVoice([{ lang: 'ru-RU', remote: false }, uk, us]), us);
  assert.equal(chooseVoice([uk]), uk);
  assert.equal(chooseVoice([{ lang: 'en-US', remote: true }]), null);
});
