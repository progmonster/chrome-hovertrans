import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTranslation, translate } from '../src/providers/mymemory.js';
import { parseExamples, safeLink } from '../src/providers/dictionary.js';
import { fetchJson } from '../src/providers/http.js';
import { readFileSync } from 'node:fs';

const data = {
  responseStatus: 200, quotaFinished: false, responseData: { translatedText: 'привет' },
  matches: [
    { segment: 'hello', translation: 'здравствуйте', source: 'en-GB', target: 'ru-RU' },
    { segment: 'hello world', translation: 'привет, мир', source: 'en', target: 'ru' },
    { segment: 'hello', translation: 'bonjour', source: 'en', target: 'fr' },
  ],
};

test('saved real API fixtures normalize translation and attributed examples', () => {
  const translationData = JSON.parse(readFileSync(new URL('fixtures/mymemory-hello.json', import.meta.url)));
  const dictionaryData = JSON.parse(readFileSync(new URL('fixtures/dictionary-hello.json', import.meta.url)));
  assert.ok(parseTranslation(translationData, 'hello').translation);
  const result = parseExamples(dictionaryData);
  assert.equal(result.examples.length, 2);
  assert.ok(result.examples.every(example => example.sourceUrl.startsWith('https://en.wiktionary.org/')));
});

test('translation only exposes exact-word Russian alternatives', () => {
  assert.deepEqual(parseTranslation(data, 'hello').alternatives, ['здравствуйте']);
  assert.throws(() => parseTranslation({ ...data, quotaFinished: true }, 'hello'), { code: 'RATE_LIMIT' });
  assert.throws(() => parseTranslation({ ...data, responseData: { translatedText: 'hello' } }, 'hello'), { code: 'NOT_FOUND' });
  assert.throws(() => parseTranslation({}, 'hello'), { code: 'INVALID_RESPONSE' });
});

test('outgoing request has fixed endpoint/languages, encoded word and no credentials/context', async () => {
  await translate("don't", { fetcher: async (url, options) => {
    assert.equal(url.origin, 'https://api.mymemory.translated.net');
    assert.deepEqual([...url.searchParams], [['q', "don't"], ['langpair', 'en|ru']]);
    assert.equal(options.credentials, 'omit'); assert.equal(options.referrerPolicy, 'no-referrer');
    assert.equal(options.redirect, 'error');
    return new Response(JSON.stringify(data));
  } });
});

test('HTTP errors, API limits and malformed JSON are explicit', async () => {
  for (const [status, code] of [[429, 'RATE_LIMIT'], [404, 'NOT_FOUND'], [500, 'UNAVAILABLE']]) {
    await assert.rejects(fetchJson('https://test.invalid', { fetcher: async () => new Response('', { status }) }), { code });
  }
  await assert.rejects(fetchJson('https://test.invalid', { fetcher: async () => new Response('oops') }), { code: 'INVALID_RESPONSE' });
  await assert.rejects(fetchJson('https://test.invalid', { fetcher: async () => { throw new TypeError('offline'); } }), { code: 'NETWORK' });
});

test('timeout and explicit cancellation are distinct', async () => {
  const fetcher = (url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  });
  // Keep a referenced timer while AbortSignal.timeout uses an unreferenced internal timer in Node.
  const keepAlive = setTimeout(() => {}, 200);
  await assert.rejects(fetchJson('https://test.invalid', { timeoutMs: 5, fetcher }), { code: 'TIMEOUT' });
  clearTimeout(keepAlive);
  const controller = new AbortController();
  const pending = fetchJson('https://test.invalid', { signal: controller.signal, fetcher });
  controller.abort(); await assert.rejects(pending, { code: 'CANCELLED' });
});

test('examples carry attribution; arbitrary URLs are rejected and missing examples are allowed', () => {
  const result = parseExamples([{
    license: { name: 'CC BY-SA 3.0', url: 'https://creativecommons.org/licenses/by-sa/3.0' },
    sourceUrls: ['javascript:alert(1)', 'https://en.wiktionary.org/wiki/hello'],
    meanings: [{ definitions: [{ example: '<img onerror=alert(1)>' }, { example: 'Hello!' }, { example: 'Third' }] }],
  }]);
  assert.equal(result.examples.length, 2);
  assert.equal(result.examples[0].text, '<img onerror=alert(1)>'); // popup must use textContent
  assert.equal(result.examples[0].sourceUrl, 'https://en.wiktionary.org/wiki/hello');
  assert.equal(safeLink('https://evil.invalid', ['en.wiktionary.org']), null);
  assert.deepEqual(parseExamples([{ meanings: [] }]).examples, []);
});
