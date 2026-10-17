import { MAX_WORD_LENGTH } from './config.js';

const TOKEN = /[A-Za-z]+(?:['’\-][A-Za-z]+)*/g;
const WHOLE_WORD = /^[A-Za-z]+(?:['’\-][A-Za-z]+)*$/;

export function validWord(word) {
  return typeof word === 'string' && word.length <= MAX_WORD_LENGTH && WHOLE_WORD.test(word);
}

export function normalizeWord(word) {
  return word.toLowerCase().replaceAll('’', "'");
}

export function tokenAt(text, offset) {
  // Do not turn the Latin portion of a number or a non-Latin token into a word.
  for (const match of text.matchAll(TOKEN)) {
    const start = match.index;
    const end = start + match[0].length;
    if (offset < start || offset > end) continue;
    const before = text.slice(0, start).at(-1) || '';
    const after = text.slice(end, end + 1);
    if (/[\p{L}\p{N}_]/u.test(before) || /[\p{L}\p{N}_]/u.test(after)) continue;
    if (validWord(match[0])) return { word: match[0], start, end };
  }
  return null;
}
