export type Clock = () => number;

export type TtlCache = {
  get<T>(key: string, load: () => Promise<T>, ttlMs: number, opts?: { force?: boolean }): Promise<T>;
  invalidate(keyOrPrefix: string): void;
};

type Entry = { value: unknown; expiresAt: number };

export function createTtlCache(opts?: { now?: Clock }): TtlCache {
  const now = opts?.now ?? Date.now;
  const values = new Map<string, Entry>();
  const inflight = new Map<string, Promise<unknown>>();

  return {
    get: (key, load, ttlMs, getOpts) => getValue({ key, load, ttlMs, force: getOpts?.force, now, values, inflight }),
    invalidate: (keyOrPrefix) => invalidateKeys(values, keyOrPrefix),
  };
}

let shared: TtlCache = createTtlCache();

export function getCache(): TtlCache {
  return shared;
}

export function resetCacheForTests(opts?: { now?: Clock }): TtlCache {
  shared = createTtlCache(opts);
  return shared;
}

async function getValue<T>(args: {
  key: string;
  load: () => Promise<T>;
  ttlMs: number;
  force?: boolean;
  now: Clock;
  values: Map<string, Entry>;
  inflight: Map<string, Promise<unknown>>;
}): Promise<T> {
  const { key, load, ttlMs, force, now, values, inflight } = args;
  if (!force) {
    const hit = values.get(key);
    if (hit && hit.expiresAt > now()) return hit.value as T;
  }
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;
  const promise = runLoad(key, load, ttlMs, now, values, inflight);
  inflight.set(key, promise);
  return promise;
}

async function runLoad<T>(
  key: string,
  load: () => Promise<T>,
  ttlMs: number,
  now: Clock,
  values: Map<string, Entry>,
  inflight: Map<string, Promise<unknown>>,
): Promise<T> {
  try {
    const value = await load();
    if (ttlMs > 0) values.set(key, { value, expiresAt: now() + ttlMs });
    else values.delete(key);
    return value;
  } catch (err) {
    values.delete(key);
    throw err;
  } finally {
    inflight.delete(key);
  }
}

function invalidateKeys(values: Map<string, Entry>, keyOrPrefix: string): void {
  if (keyOrPrefix.endsWith("*")) {
    const prefix = keyOrPrefix.slice(0, -1);
    for (const key of [...values.keys()]) {
      if (key.startsWith(prefix)) values.delete(key);
    }
    return;
  }
  values.delete(keyOrPrefix);
}
