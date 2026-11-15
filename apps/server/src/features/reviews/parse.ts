export type DraftComment = { path: string; line: number; body: string };

export function parseReviewDraft(text: string): { summary: string; comments: DraftComment[] } {
  const fence = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = fence?.[1];
  const comments = raw ? commentsFrom(raw) : [];
  const summary = text.replace(/```json[\s\S]*?```/gi, "").trim() || "Claude drafted a review.";
  return { summary: summary.slice(0, 4000), comments };
}

function commentsFrom(raw: string): DraftComment[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        const row = item as { path?: unknown; line?: unknown; body?: unknown };
        const path = String(row.path ?? "").trim();
        const line = Number(row.line);
        const body = String(row.body ?? "").trim();
        if (!path || !body || !Number.isInteger(line) || line < 1) return undefined;
        return { path, line, body };
      })
      .filter((c): c is DraftComment => Boolean(c));
  } catch {
    return [];
  }
}
