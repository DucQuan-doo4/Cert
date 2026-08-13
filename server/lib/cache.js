/**
 * Simple in-memory cache with TTL
 */
class Cache {
  constructor() {
    this.store = new Map();
  }

  set(key, value, ttlMs = 5 * 60 * 1000) { // default 5 min
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  size() {
    return this.store.size;
  }
}

// Singleton instances
const questionCache = new Cache(); // TTL 10 min — exam pages
const examCache = new Cache();     // TTL 60 min — exam catalog rarely changes

module.exports = { questionCache, examCache, Cache };
