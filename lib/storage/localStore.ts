import { useSyncExternalStore } from "react";
import { z } from "zod";

/**
 * A tiny typed "repository" over the browser's localStorage.
 *
 * Why localStorage? Resumes are personal data. Keeping saved reports and the
 * job tracker on the user's own device means no database, no accounts and no
 * data breach risk for an MVP. Because every component talks to this
 * interface (list/add/update/remove), swapping it for a real backend
 * (Postgres + auth) later only changes this file: the Repository pattern.
 *
 * Data read back from storage is validated with Zod: users (or old app
 * versions) can leave anything in there, so we never trust it blindly.
 */

export interface Identified {
  id: string;
}

export interface LocalStore<T extends Identified> {
  list(): T[];
  add(item: T): void;
  update(id: string, patch: Partial<T>): void;
  remove(id: string): void;
  subscribe(listener: () => void): () => void;
}

const EMPTY: never[] = [];

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // e.g. blocked by privacy settings
  }
}

export function createLocalStore<T extends Identified>(options: {
  key: string; // include a version, e.g. "cc.reports.v1", so a schema change can start fresh
  schema: z.ZodType<T>;
  maxItems?: number;
  storage?: () => Storage | null; // injectable for tests
}): LocalStore<T> {
  const { key, schema, maxItems = 50, storage = browserStorage } = options;
  const listeners = new Set<() => void>();

  // useSyncExternalStore needs the SAME array back while nothing changed,
  // so we memoise on the raw string.
  let lastRaw: string | null = null;
  let lastItems: T[] = EMPTY;

  function parse(raw: string | null): T[] {
    if (!raw) return EMPTY;
    try {
      const data: unknown = JSON.parse(raw);
      if (!Array.isArray(data)) return EMPTY;
      // Keep the valid items and drop corrupted ones instead of losing everything.
      return data.flatMap((item) => {
        const parsed = schema.safeParse(item);
        return parsed.success ? [parsed.data] : [];
      });
    } catch {
      return EMPTY;
    }
  }

  function list(): T[] {
    const s = storage();
    if (!s) return EMPTY;
    let raw: string | null;
    try {
      raw = s.getItem(key);
    } catch {
      return EMPTY;
    }
    if (raw !== lastRaw) {
      lastRaw = raw;
      lastItems = parse(raw);
    }
    return lastItems;
  }

  function write(items: T[]) {
    const s = storage();
    if (!s) return;
    try {
      s.setItem(key, JSON.stringify(items.slice(0, maxItems)));
    } catch {
      // Quota exceeded or storage blocked: the app keeps working, it just can't save.
    }
    listeners.forEach((l) => l());
  }

  return {
    list,
    add: (item) => write([item, ...list().filter((i) => i.id !== item.id)]),
    update: (id, patch) => write(list().map((i) => (i.id === id ? { ...i, ...patch } : i))),
    remove: (id) => write(list().filter((i) => i.id !== id)),
    subscribe(listener) {
      listeners.add(listener);
      // Keep several open tabs in sync.
      const onStorage = (e: StorageEvent) => e.key === key && listener();
      if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
      };
    },
  };
}

/**
 * React hook: re-renders when the store changes. The server snapshot is an
 * empty list, so server HTML and the first client render always agree
 * (no hydration mismatch).
 */
export function useLocalStore<T extends Identified>(store: LocalStore<T>): T[] {
  return useSyncExternalStore(store.subscribe, store.list, () => EMPTY);
}
