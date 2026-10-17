export class ProviderError extends Error {
  constructor(code, retryAfterMs = 0) {
    super(code);
    this.code = code;
    this.retryAfterMs = retryAfterMs;
  }
}

export async function fetchJson(url, { signal, timeoutMs = 5000, fetcher = fetch } = {}) {
  const timeout = AbortSignal.timeout(timeoutMs);
  try {
    const response = await fetcher(url, {
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      redirect: 'error',
      cache: 'no-store',
    });
    if (response.status === 429) {
      const retry = response.headers.get('Retry-After');
      const millis = /^\d+$/.test(retry || '') ? Number(retry) * 1000 : Date.parse(retry) - Date.now();
      throw new ProviderError('RATE_LIMIT', Math.max(60000, Number.isFinite(millis) ? millis : 0));
    }
    if (response.status === 404) throw new ProviderError('NOT_FOUND');
    if (!response.ok) throw new ProviderError('UNAVAILABLE');
    try {
      return await response.json();
    } catch (error) {
      if (timeout.aborted || signal?.aborted) throw error;
      throw new ProviderError('INVALID_RESPONSE');
    }
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (timeout.aborted) throw new ProviderError('TIMEOUT');
    if (signal?.aborted) throw new ProviderError('CANCELLED');
    throw new ProviderError('NETWORK');
  }
}
