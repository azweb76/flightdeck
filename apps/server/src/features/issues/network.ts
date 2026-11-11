/** HTTP 4xx/5xx from a reachable API is not "offline". */
export function isNetworkFailure(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENETUNREACH|EAI_AGAIN|fetch failed|network|offline|certificate|socket hang up/i.test(
    message,
  );
}
