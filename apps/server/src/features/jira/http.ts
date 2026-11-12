export function authHeaders(email: string, token: string): Record<string, string> {
  const basic = Buffer.from(`${email}:${token}`).toString("base64");
  return { Authorization: `Basic ${basic}`, Accept: "application/json" };
}

export async function throwIfJiraFailed(res: Response, prefix: string): Promise<void> {
  if (res.ok) return;
  const text = await res.text();
  throw new Error(detail(text) ? `${prefix} (${res.status}): ${detail(text)}` : `${prefix} (${res.status})`);
}

export function parseJiraErrorBody(text: string): string | undefined {
  return detail(text);
}

function detail(text: string): string | undefined {
  try {
    const body = JSON.parse(text) as { errorMessages?: unknown; errors?: unknown; message?: unknown };
    const msgs = Array.isArray(body.errorMessages)
      ? body.errorMessages.map((m) => String(m).trim()).filter(Boolean)
      : [];
    if (msgs.length) return msgs.join("; ");
    if (body.errors && typeof body.errors === "object" && !Array.isArray(body.errors)) {
      const parts = Object.entries(body.errors as Record<string, unknown>).map(([k, v]) => `${k}: ${String(v)}`);
      if (parts.length) return parts.join("; ");
    }
    if (typeof body.message === "string" && body.message.trim()) return body.message.trim();
  } catch {
    /* not JSON */
  }
  const trimmed = text.trim();
  return trimmed && trimmed.length < 300 ? trimmed : undefined;
}
