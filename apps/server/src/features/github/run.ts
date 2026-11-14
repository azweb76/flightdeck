import { isGithubRateLimit, RateLimitError, withBackoff } from "../cache/index.ts";
import type { ExecFn, ExecOpts, ExecResult } from "../exec/index.ts";

export async function runGh(exec: ExecFn, args: string[], opts?: ExecOpts): Promise<ExecResult> {
  return withBackoff(async () => {
    const result = await exec("gh", args, opts);
    const text = `${result.stderr}\n${result.stdout}`;
    if (result.code !== 0 && isGithubRateLimit(text)) throw new RateLimitError("GitHub");
    return result;
  }, "GitHub");
}
