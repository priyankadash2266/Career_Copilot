/**
 * Tiny in-memory LRU cache with time-to-live.
 *
 * Why: the same resume + role analysed twice should not pay for a second LLM
 * call (cost + latency). A JS Map remembers insertion order, so deleting and
 * re-inserting a key on read moves it to the "most recently used" end, and the
 * first key is always the least recently used one to evict.
 *
 * Limitation (worth saying in interviews): memory is per server instance and
 * lost on restart. In production you would swap this for Redis behind the same
 * get/set interface — callers would not change.
 */
export class TtlLruCache<V> {
  private store = new Map<string, { value: V; expiresAt: number }>();

  constructor(
    private readonly maxEntries: number,
    private readonly ttlMs: number,
  ) {}

  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: V): void {
    this.store.delete(key);
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    if (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
  }

  get size(): number {
    return this.store.size;
  }
}
