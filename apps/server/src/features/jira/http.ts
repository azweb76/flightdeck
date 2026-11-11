export function authHeaders(email: string, token: string): Record<string, string> {
  const basic = Buffer.from(`${email}:${token}`).toString("base64");
  return { Authorization: `Basic ${basic}`, Accept: "application/json" };
}

/** Prefer Atlassian errorMessages/errors over a bare status code. */
export async function jiraHttpError(res: Response, prefix: string): Promise<Error> {
  const text = await res.text();
  const detail = parseJiraErrorBody(text);
  return new Error(detail ? `${prefix} (${res.status}): ${detail}` : `${prefix} (${res.status})`);
}

export function parseJiraErrorBody(text: string): string | undefined {
  try {
    const body = JSON.parse(text) as { errorMessages?: unknown; errors?: unknown; message?: unknown };
    const msgs = Array.isArray(body.errorMessages)
      ? body.errorMessages.map((m) => String(m).trim()).filter(Boolean)
      : [];
    if (msgs.length) return msgs.join("; ");
    if (body.errors && typeof body.errors === "object" && !Array.isArray(body.errors)) {
      const parts = Object.entries(body.errors as Record<string, unknown>)
        .map(([k, v]) => `${k}: ${String(v)}`)
        .filter((s) => !s.endsWith(": "));
      if (parts.length) return parts.join("; ");
    }
    if (typeof body.message === "string" && body.message.trim()) return body.message.trim();
  } catch {
    /* not JSON */
  }
  const trimmed = text.trim();
  return trimmed && trimmed.length < 300 ? trimmed : undefined;
}

export async function throwIfJiraFailed(res: Response, prefix: string): Promise<void> {
  if (res.ok) return;
  throw await jiraHttpError(res, prefix);
}
