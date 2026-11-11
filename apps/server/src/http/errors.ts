import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";

export function apiError(status: number, code: string, message: string): HTTPException {
  return new HTTPException(status as never, { message: JSON.stringify({ error: { code, message } }) });
}

export function formatError(err: unknown): { status: number; body: unknown } {
  if (err instanceof HTTPException) {
    try {
      return { status: err.status, body: JSON.parse(err.message) as unknown };
    } catch {
      return { status: err.status, body: { error: { code: "http", message: err.message } } };
    }
  }
  if (err instanceof ZodError) {
    return {
      status: 400,
      body: { error: { code: "invalid", message: err.issues[0]?.message ?? "Invalid request" } },
    };
  }
  const message = err instanceof Error ? err.message : "Internal error";
  return { status: 500, body: { error: { code: "internal", message } } };
}
