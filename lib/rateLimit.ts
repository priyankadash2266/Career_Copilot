/**
 * Fixed-window rate limiter: at most `limit` requests per client per minute.
 * Protects the LLM budget from abuse and accidental loops.
 *
 * Same production caveat as the cache: per-instance memory. Use Redis
 * (e.g. Upstash) when running multiple servers.
 */
export class RateLimiter {
  private windows = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs = 60_000,
  ) {}

  /** Returns how many seconds the caller must wait, or 0 if the request is allowed. */
  check(clientId: string, now = Date.now()): number {
    const current = this.windows.get(clientId);
    if (!current || now >= current.resetAt) {
      this.windows.set(clientId, { count: 1, resetAt: now + this.windowMs });
      this.sweep(now);
      return 0;
    }
    if (current.count >= this.limit) {
      return Math.ceil((current.resetAt - now) / 1000);
    }
    current.count += 1;
    return 0;
  }

  /** Drop expired windows so the map cannot grow forever. */
  private sweep(now: number) {
    if (this.windows.size < 1000) return;
    for (const [key, value] of this.windows) {
      if (now >= value.resetAt) this.windows.delete(key);
    }
  }
}
