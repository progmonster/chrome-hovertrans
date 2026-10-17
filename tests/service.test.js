import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createService } from '../src/background/service.js';
import { ProviderError } from '../src/providers/http.js';

const sender = (id = 1) => ({ tab: { id }, frameId: 0, url: 'https://example.org/' });
const message = (requestId, word = 'hello', type = 'TRANSLATE') => ({ type, word, requestId });
const translation = word => ({ word, translation: 'перевод', alternatives: [], provider: 'MyMemory' });

test('worker validates word/frame/origin and never accepts arbitrary HTTP requests', async () => {
  const service = createService({ translator: async () => { throw new Error('must not fetch'); } });
  for (const [msg, from] of [
    [message('1', 'hello world'), sender()], [message('1'), { ...sender(), frameId: 1 }],
    [message('1'), { ...sender(), url: 'file:///test' }], [{ type: 'FETCH', url: 'https://evil.invalid', requestId: '1', word: 'hello' }, sender()],
  ]) assert.equal((await service.handle(msg, from)).ok, false);
});

test('cache avoids another network call and rate limiting blocks rapid different words', async () => {
  let calls = 0;
  const service = createService({ translator: async word => { calls++; return translation(word); }, now: () => 10 });
  assert.ok((await service.handle(message('a'), sender())).ok);
  assert.ok((await service.handle(message('b', 'HELLO'), sender())).ok);
  assert.equal(calls, 1);
  assert.equal((await service.handle(message('c', 'bank'), sender())).error.code, 'RATE_LIMIT');
});

test('cancelled response is not cached; another tab is independent', async () => {
  const waiting = [];
  const service = createService({ translator: word => new Promise(resolve => waiting.push(() => resolve(translation(word)))) });
  const a = service.handle(message('a'), sender(1));
  const b = service.handle(message('b'), sender(2));
  await service.handle(message('a', 'hello', 'CANCEL'), sender(1));
  waiting.forEach(resolve => resolve());
  assert.equal((await a).error.code, 'CANCELLED'); assert.ok((await b).ok);
});

test('429 cooldown is per provider, honors retry delay, and does not poison successful cache', async () => {
  let time = 0, calls = 0;
  const service = createService({
    now: () => time,
    translator: async word => { calls++; if (calls === 1) throw new ProviderError('RATE_LIMIT', 120000); return translation(word); },
  });
  assert.equal((await service.handle(message('a'), sender())).error.code, 'RATE_LIMIT');
  time = 60001;
  assert.equal((await service.handle(message('b'), sender())).error.code, 'RATE_LIMIT'); assert.equal(calls, 1);
  time = 120001; assert.ok((await service.handle(message('c'), sender())).ok); assert.equal(calls, 2);
});

test('dictionary only accepts the current successful search and preserves translation on failure', async () => {
  const service = createService({ translator: async word => translation(word), dictionary: async () => { throw new ProviderError('NOT_FOUND'); } });
  assert.equal((await service.handle(message('a', 'hello', 'EXAMPLES'), sender())).ok, false);
  assert.ok((await service.handle(message('a'), sender())).ok);
  assert.equal((await service.handle(message('a', 'hello', 'EXAMPLES'), sender())).error.code, 'NOT_FOUND');
  assert.equal((await service.handle(message('a', 'hello', 'EXAMPLES'), sender())).error.code, 'UNAVAILABLE');
  assert.ok((await service.handle(message('b'), sender())).ok);
});
