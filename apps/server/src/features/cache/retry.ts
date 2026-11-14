import { RATE_LIMIT } from "./ttls.ts";

export class RateLimitError extends Error {
  readonly service: string;
  readonly retryAfterMs?: number;

  constructor(service: string, retryAfterMs?: number) {
    super(rateLimitMessage(service, retryAfterMs ?? RATE_LIMIT.initialMs));
    this.name = "RateLimitError";
    this.service = service;
    this.retryAfterMs = retryAfterMs;
  }
}

export function rateLimitMessage(service: string, waitMs: number): string {
  const sec = Math.max(1, Math.ceil(waitMs / 1000));
  return `${service} is rate limiting, retrying in ${sec}s`;
}

export function isGithubRateLimit(text: string): boolean {
  return /api rate limit exceeded/i.test(text) || /secondary rate limit/i.test(text);
}

export function parseRetryAfterMs(header: string | null | undefined, now = Date.now()): number | undefined {
  if (!header?.trim()) return undefined;
  const trimmed = header.trim();
  const sec = Number(trimmed);
  if (Number.isFinite(sec)) return Math.max(0, sec * 1000);
  const date = Date.parse(trimmed);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, date - now);
}

export function parseResetHeaderMs(reset: string | null | undefined, now = Date.now()): number | undefined {
  if (!reset?.trim()) return undefined;
  const unix = Number(reset.trim());
  if (!Number.isFinite(unix)) return undefined;
  return Math.max(0, unix * 1000 - now);
}

export function githubWaitFromHeaders(headers: { get?: (name: string) => string | null; [key: string]: unknown }): number | undefined {
  const get = (name: string) => {
    if (typeof headers.get === "function") return headers.get(name);
    const rec = headers as Record<string, unknown>;
    const v = rec[name] ?? rec[name.toLowerCase()];
    return typeof v === "string" ? v : undefined;
  };
  return parseRetryAfterMs(get("retry-after")) ?? parseResetHeaderMs(get("x-ratelimit-reset"));
}

export function waitMsForAttempt(err: unknown, attempt: number): number {
  if (err instanceof RateLimitError && err.retryAfterMs != null) {
    return Math.min(err.retryAfterMs, RATE_LIMIT.capMs);
  }
  return Math.min(RATE_LIMIT.initialMs * 2 ** attempt, RATE_LIMIT.capMs);
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
let sleepFn = defaultSleep;

export function setSleepForTests(fn?: (ms: number) => Promise<void>): void {
  sleepFn = fn ?? defaultSleep;
}

export async function withBackoff<T>(op: () => Promise<T>, service: string): Promise<T> {
  let lastWait: number = RATE_LIMIT.initialMs;
  for (let attempt = 0; attempt < RATE_LIMIT.maxAttempts; attempt++) {
    try {
      return await op();
    } catch (err) {
      const limited = err instanceof RateLimitError;
      if (!limited || attempt === RATE_LIMIT.maxAttempts - 1) {
        if (limited) throw new RateLimitError(service, lastWait);
        throw err;
      }
      lastWait = waitMsForAttempt(err, attempt);
      await sleepFn(lastWait);
    }
  }
  throw new RateLimitError(service, lastWait);
}
