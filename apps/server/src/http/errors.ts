import { HTTPException } from "hono/http-exception";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";

export function onError(err: Error, c: Context): Response | Promise<Response> {
  const status = (err instanceof HTTPException ? err.status : 400) as ContentfulStatusCode;
  return c.json({ error: friendly(err) }, status);
}

export function fail(message: string, status: ContentfulStatusCode = 400): never {
  throw new HTTPException(status, { message });
}

function friendly(err: Error): string {
  if (err instanceof ZodError) {
    const first = err.issues[0];
    if (first?.path.join(".") === "dollarCapUsd") return "Per-run cap must be a number greater than 0";
    if (first?.path.join(".") === "dailyDollarCapUsd") return "Daily cap must be a number greater than 0";
    if (first?.path.join(".") === "maxConcurrentAgents") return "Max concurrent agents must be a whole number from 1 to 20";
    return "That value is not valid. Check the field and try again.";
  }
  return err.message || "Request failed";
}
