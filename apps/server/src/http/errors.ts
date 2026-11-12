import { HTTPException } from "hono/http-exception";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export function onError(err: Error, c: Context): Response | Promise<Response> {
  const status = (err instanceof HTTPException ? err.status : 400) as ContentfulStatusCode;
  const message = err.message || "Request failed";
  return c.json({ error: message }, status);
}

export function fail(message: string, status: ContentfulStatusCode = 400): never {
  throw new HTTPException(status, { message });
}
