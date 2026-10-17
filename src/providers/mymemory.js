import { fetchJson, ProviderError } from './http.js';
import { normalizeWord } from '../shared/words.js';

const clean = value => typeof value === 'string' ? value.trim().slice(0, 1200) : '';

export function parseTranslation(data, word) {
  if (data?.quotaFinished || Number(data?.responseStatus) === 429 || Number(data?.responseStatus) === 403) {
    throw new ProviderError('RATE_LIMIT', 60000);
  }
  if (Number(data?.responseStatus) !== 200) throw new ProviderError('INVALID_RESPONSE');
  const translation = clean(data.responseData?.translatedText);
  if (!translation || normalizeWord(translation) === normalizeWord(word)) throw new ProviderError('NOT_FOUND');
  const alternatives = [...new Set((Array.isArray(data.matches) ? data.matches : [])
    .filter(match => typeof match.segment === 'string' && normalizeWord(match.segment) === normalizeWord(word)
      && /^en(?:-|$)/i.test(match.source || '') && /^ru(?:-|$)/i.test(match.target || ''))
    .map(match => clean(match.translation))
    .filter(value => value && value !== translation && normalizeWord(value) !== normalizeWord(word)))].slice(0, 3);
  return { word, translation, alternatives, provider: 'MyMemory' };
}

export async function translate(word, options) {
  const url = new URL('https://api.mymemory.translated.net/get');
  url.searchParams.set('q', word);
  url.searchParams.set('langpair', 'en|ru');
  return parseTranslation(await fetchJson(url, options), word);
}
