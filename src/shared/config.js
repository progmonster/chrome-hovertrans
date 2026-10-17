export const HOVER_DELAY_MS = 500;
export const POINTER_TOLERANCE_PX = 4;
export const LEAVE_DELAY_MS = 300;
export const MAX_WORD_LENGTH = 64;
export const CACHE_TTL_MS = 10 * 60 * 1000;
export const CACHE_LIMIT = 200;
export const SEARCH_INTERVAL_MS = 1000;

export const ERROR_MESSAGES = {
  NETWORK: 'Нет связи с сервисом перевода. Проверьте интернет.',
  TIMEOUT: 'Сервис не ответил вовремя. Попробуйте ещё раз.',
  RATE_LIMIT: 'Лимит сервиса или слишком частые запросы. Попробуйте позже.',
  NOT_FOUND: 'Перевод этого слова не найден.',
  INVALID_RESPONSE: 'Сервис вернул неожиданный ответ.',
  UNAVAILABLE: 'Сервис сейчас недоступен. Попробуйте ещё раз.',
};
