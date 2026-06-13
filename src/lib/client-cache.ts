/**
 * Module-level in-memory cache for client components.
 * Lives for the browser session — each key holds data + an expiry timestamp.
 * Survives React unmount/remount (tab switches, back-navigation) within TTL.
 */

type Entry<T> = { data: T; exp: number };

const store = new Map<string, Entry<unknown>>();

export function cacheGet<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.exp) {
    store.delete(key);
    return undefined;
  }
  return hit.data as T;
}

export function cacheSet<T>(key: string, data: T, ttlMs = 60_000): void {
  store.set(key, { data, exp: Date.now() + ttlMs });
}

/** Remove exact keys. */
export function cacheDelete(...keys: string[]): void {
  for (const k of keys) store.delete(k);
}

/** Remove all keys that start with a given prefix. */
export function cacheDeletePrefix(prefix: string): void {
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}
