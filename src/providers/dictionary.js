import { fetchJson, ProviderError } from './http.js';

export function safeLink(value, hosts) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && hosts.includes(url.hostname) && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function parseExamples(data) {
  if (!Array.isArray(data)) throw new ProviderError('INVALID_RESPONSE');
  const examples = [];
  for (const entry of data) {
    if (!Array.isArray(entry.meanings)) continue;
    for (const meaning of entry.meanings) {
      for (const definition of Array.isArray(meaning.definitions) ? meaning.definitions : []) {
        if (typeof definition.example !== 'string' || !definition.example.trim()) continue;
        const text = definition.example.trim().slice(0, 600);
        if (examples.some(example => example.text === text)) continue;
        examples.push({
          text,
          sourceUrl: (Array.isArray(entry.sourceUrls) ? entry.sourceUrls : [])
            .map(url => safeLink(url, ['en.wiktionary.org'])).find(Boolean) || 'https://dictionaryapi.dev/',
          licenseName: typeof entry.license?.name === 'string' ? entry.license.name.slice(0, 80) : '',
          licenseUrl: safeLink(entry.license?.url, ['creativecommons.org']),
        });
        if (examples.length === 2) return { examples, provider: 'Free Dictionary API / Wiktionary' };
      }
    }
  }
  return { examples, provider: 'Free Dictionary API / Wiktionary' };
}

export async function lookupExamples(word, options) {
  return parseExamples(await fetchJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
    ...options, timeoutMs: 3000,
  }));
}
