type EtagEntry<T> = { etag: string; data: T };

const remembered = new Map<string, EtagEntry<unknown>>();

export function rememberedEtag(key: string): string | undefined {
  return remembered.get(key)?.etag;
}

export function rememberEtag<T>(key: string, etag: string, data: T): T {
  if (etag) remembered.set(key, { etag, data });
  return data;
}

export function etagHit<T>(key: string): T | undefined {
  return remembered.get(key)?.data as T | undefined;
}

export function clearEtags(): void {
  remembered.clear();
}

export function isNotModified(err: unknown): boolean {
  return (err as { status?: number }).status === 304;
}
