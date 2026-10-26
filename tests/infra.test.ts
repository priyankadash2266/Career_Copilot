import { describe, expect, it, vi } from "vitest";
import { TtlLruCache } from "@/lib/cache";
import { RateLimiter } from "@/lib/rateLimit";
import { AppError, toErrorBody } from "@/lib/errors";
import { isPdf, normalizeText } from "@/lib/resume/extractText";

describe("TtlLruCache", () => {
  it("evicts the least recently used entry", () => {
    const cache = new TtlLruCache<number>(2, 60_000);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.get("a"); // "a" is now most recent
    cache.set("c", 3); // evicts "b"
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe(1);
    expect(cache.get("c")).toBe(3);
  });

  it("expires entries after the TTL", () => {
    vi.useFakeTimers();
    const cache = new TtlLruCache<number>(10, 1000);
    cache.set("a", 1);
    vi.advanceTimersByTime(1001);
    expect(cache.get("a")).toBeUndefined();
    vi.useRealTimers();
  });
});

describe("RateLimiter", () => {
  it("allows `limit` requests per window then blocks", () => {
    const limiter = new RateLimiter(2, 60_000);
    expect(limiter.check("ip", 0)).toBe(0);
    expect(limiter.check("ip", 1)).toBe(0);
    expect(limiter.check("ip", 2)).toBeGreaterThan(0);
    expect(limiter.check("other-ip", 2)).toBe(0); // per client
    expect(limiter.check("ip", 60_001)).toBe(0); // new window
  });
});

describe("errors", () => {
  it("exposes AppError details but hides unexpected errors", () => {
    expect(toErrorBody(new AppError("FILE_TOO_LARGE", "too big", 413))).toEqual({
      status: 413,
      body: { error: { code: "FILE_TOO_LARGE", message: "too big", requestId: undefined } },
    });
    const hidden = toErrorBody(new Error("DB password is hunter2"));
    expect(hidden.status).toBe(500);
    expect(hidden.body.error.message).not.toContain("hunter2");
  });
});

describe("resume text helpers", () => {
  it("detects PDFs by magic bytes, not by name", () => {
    expect(isPdf(new TextEncoder().encode("%PDF-1.7 ..."))).toBe(true);
    expect(isPdf(new TextEncoder().encode("MZ fake.exe"))).toBe(false);
  });

  it("normalizes whitespace but keeps line breaks", () => {
    expect(normalizeText("A  \t B\r\n\r\n\nC")).toBe("A B\nC");
  });
});
