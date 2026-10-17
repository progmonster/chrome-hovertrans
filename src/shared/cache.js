import { CACHE_LIMIT, CACHE_TTL_MS } from './config.js';

export class MemoryCache {
  constructor({ now = Date.now, limit = CACHE_LIMIT, ttl = CACHE_TTL_MS } = {}) {
    this.now = now;
    this.limit = limit;
    this.ttl = ttl;
    this.entries = new Map();
  }

  get(key) {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expires <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key, value) {
    this.entries.delete(key);
    this.entries.set(key, { value, expires: this.now() + this.ttl });
    while (this.entries.size > this.limit) this.entries.delete(this.entries.keys().next().value);
  }
}
