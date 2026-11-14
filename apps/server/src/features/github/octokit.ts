import { Octokit } from "@octokit/rest";
import { retry } from "@octokit/plugin-retry";
import { throttling } from "@octokit/plugin-throttling";
import { githubWaitFromHeaders, RateLimitError, withBackoff } from "../cache/index.ts";

const Api = Octokit.plugin(retry, throttling);

export type FetchFn = typeof fetch;

const immediateGroup = {
  key: () => ({
    schedule: (_job: unknown, fn?: unknown, ...args: unknown[]) =>
      typeof fn === "function" ? (fn as (...a: unknown[]) => unknown)(...args) : undefined,
  }),
};

const immediateLimiter = {
  on() {
    /* ignore Bottleneck retry hooks so 403/429 throw into withBackoff */
  },
  schedule<T>(fn: (...a: never[]) => T, ...args: never[]) {
    return fn(...args);
  },
};

export function createOctokit(token: string, fetchFn: FetchFn = fetch): Octokit {
  return new Api({
    auth: token,
    request: { fetch: fetchFn, retries: 0 },
    throttle: {
      enabled: true,
      onRateLimit: () => false,
      onSecondaryRateLimit: () => false,
      global: immediateGroup,
      auth: immediateGroup,
      search: immediateGroup,
      write: immediateGroup,
      notifications: immediateGroup,
      retryLimiter: immediateLimiter,
    } as never,
  });
}

export async function githubCall<T>(op: () => Promise<T>): Promise<T> {
  return withBackoff(async () => {
    try {
      return await op();
    } catch (err) {
      const limited = rateLimitError(err);
      if (limited) throw limited;
      throw err;
    }
  }, "GitHub");
}

function rateLimitError(err: unknown): RateLimitError | undefined {
  const e = err as { status?: number; message?: string; response?: { headers?: Record<string, string> } };
  const headers = e.response?.headers ?? {};
  const remaining = headers["x-ratelimit-remaining"] ?? headers["X-RateLimit-Remaining"];
  const msg = e.message ?? "";
  const secondary = /secondary rate limit/i.test(msg);
  const primary = e.status === 429 || remaining === "0" || /api rate limit exceeded/i.test(msg);
  if (e.status === 429 || secondary || (e.status === 403 && primary)) {
    return new RateLimitError("GitHub", githubWaitFromHeaders(headers));
  }
  return undefined;
}
