import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createLocalStore } from "@/lib/storage/localStore";

/** In-memory stand-in for window.localStorage (Dependency Injection again). */
function fakeStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    clear: () => data.clear(),
    key: (i) => [...data.keys()][i] ?? null,
    get length() {
      return data.size;
    },
  };
}

const Item = z.object({ id: z.string(), name: z.string() });

describe("createLocalStore", () => {
  it("adds newest first, updates, removes and caps the list", () => {
    const storage = fakeStorage();
    const store = createLocalStore({ key: "t", schema: Item, maxItems: 2, storage: () => storage });
    store.add({ id: "1", name: "a" });
    store.add({ id: "2", name: "b" });
    store.add({ id: "3", name: "c" });
    expect(store.list().map((i) => i.id)).toEqual(["3", "2"]);
    store.update("2", { name: "B" });
    expect(store.list()[1].name).toBe("B");
    store.remove("3");
    expect(store.list().map((i) => i.id)).toEqual(["2"]);
  });

  it("returns the same array while nothing changed (needed by useSyncExternalStore)", () => {
    const storage = fakeStorage();
    const store = createLocalStore({ key: "t", schema: Item, storage: () => storage });
    store.add({ id: "1", name: "a" });
    expect(store.list()).toBe(store.list());
  });

  it("drops corrupted items and survives invalid JSON", () => {
    const storage = fakeStorage({ t: JSON.stringify([{ id: "1", name: "ok" }, { id: 2 }]), u: "{not json" });
    expect(createLocalStore({ key: "t", schema: Item, storage: () => storage }).list()).toHaveLength(1);
    expect(createLocalStore({ key: "u", schema: Item, storage: () => storage }).list()).toEqual([]);
  });

  it("notifies subscribers on change and works without storage (SSR)", () => {
    const storage = fakeStorage();
    const store = createLocalStore({ key: "t", schema: Item, storage: () => storage });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.add({ id: "1", name: "a" });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();

    const ssr = createLocalStore({ key: "t", schema: Item, storage: () => null });
    expect(ssr.list()).toEqual([]);
    expect(() => ssr.add({ id: "1", name: "a" })).not.toThrow();
  });
});
