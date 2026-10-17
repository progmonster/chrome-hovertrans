import { MemoryCache } from '../shared/cache.js';
import { normalizeWord, validWord } from '../shared/words.js';
import { SEARCH_INTERVAL_MS } from '../shared/config.js';
import { translate } from '../providers/mymemory.js';
import { lookupExamples } from '../providers/dictionary.js';

export function createService({ translator = translate, dictionary = lookupExamples, speech, now = Date.now } = {}) {
  const cache = new MemoryCache({ now });
  const pending = new Map();
  const cooldowns = new Map();
  const lastSearch = new Map();
  const admitted = new Map();

  async function handle(message, sender) {
    const { type, word, requestId } = message || {};
    const reply = data => ({ requestId, ...data });
    if (!sender?.tab || sender.frameId !== 0 || !/^https?:\/\//.test(sender.url || '')
      || typeof requestId !== 'string' || requestId.length > 100) {
      return reply({ ok: false, error: { code: 'UNAVAILABLE' } });
    }
    const owner = `${sender.tab.id}:${sender.frameId}`;
    const key = `${owner}:${requestId}`;
    if (type === 'CANCEL') {
      if (admitted.get(owner)?.id === requestId) admitted.delete(owner);
      for (const suffix of ['TRANSLATE', 'EXAMPLES']) pending.get(`${key}:${suffix}`)?.abort();
      return reply({ ok: true });
    }
    if (type === 'STOP_SPEECH') {
      speech?.stop(owner, requestId);
      return reply({ ok: true });
    }
    if (!validWord(word)) return reply({ ok: false, error: { code: 'INVALID_RESPONSE' } });
    if (type === 'SPEAK' || type === 'VOICE_STATUS') {
      try {
        return reply({ ok: true, ...await speech[type === 'SPEAK' ? 'speak' : 'status'](word, owner, requestId) });
      } catch {
        return reply({ ok: false, error: { code: 'UNAVAILABLE' } });
      }
    }
    if (!['TRANSLATE', 'EXAMPLES'].includes(type)) return reply({ ok: false, error: { code: 'INVALID_RESPONSE' } });
    if (type === 'EXAMPLES') {
      const search = admitted.get(owner);
      if (search?.id !== requestId || search?.word !== normalizeWord(word) || search.examplesRequested) {
        return reply({ ok: false, error: { code: 'UNAVAILABLE' } });
      }
      search.examplesRequested = true;
    }
    const provider = type === 'TRANSLATE' ? 'MyMemory:en:ru' : 'Dictionary:en';
    const cacheKey = `${provider}:${normalizeWord(word)}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      if (type === 'TRANSLATE') admitted.set(owner, { id: requestId, word: normalizeWord(word) });
      return reply({ ok: true, ...cached, word });
    }
    if ((cooldowns.get(provider) || 0) > now()) return reply({ ok: false, error: { code: 'RATE_LIMIT' } });
    if (type === 'TRANSLATE') {
      if (now() - (lastSearch.get(owner) ?? -Infinity) < SEARCH_INTERVAL_MS) {
        return reply({ ok: false, error: { code: 'RATE_LIMIT' } });
      }
      lastSearch.set(owner, now());
    }
    // One active request of each type per document; a new search never shares cancellation across tabs.
    const requestKey = `${key}:${type}`;
    if (pending.has(requestKey)) return reply({ ok: false, error: { code: 'RATE_LIMIT' } });
    for (const [existingKey, controller] of pending) {
      if (existingKey.startsWith(`${owner}:`) && existingKey.endsWith(`:${type}`)) controller.abort();
    }
    const controller = new AbortController();
    pending.set(requestKey, controller);
    try {
      const result = await (type === 'TRANSLATE' ? translator : dictionary)(word, { signal: controller.signal });
      if (controller.signal.aborted) return reply({ ok: false, error: { code: 'CANCELLED' } });
      cache.set(cacheKey, result);
      if (type === 'TRANSLATE') admitted.set(owner, { id: requestId, word: normalizeWord(word) });
      return reply({ ok: true, ...result });
    } catch (error) {
      const code = error.code || 'UNAVAILABLE';
      if (code === 'RATE_LIMIT') cooldowns.set(provider, now() + Math.max(60000, error.retryAfterMs || 0));
      return reply({ ok: false, error: { code } });
    } finally {
      pending.delete(requestKey);
    }
  }

  function forgetTab(tabId) {
    for (const [key, controller] of pending) if (key.startsWith(`${tabId}:`)) controller.abort();
    for (const key of lastSearch.keys()) if (key.startsWith(`${tabId}:`)) lastSearch.delete(key);
    for (const key of admitted.keys()) if (key.startsWith(`${tabId}:`)) admitted.delete(key);
    speech?.forgetTab(tabId);
  }
  return { handle, forgetTab };
}
