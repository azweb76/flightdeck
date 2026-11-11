import type { Issue } from "@flightdeck/shared";

export type Suggest = { id: string; label: string };

export function tokenAt(text: string, caret: number): { start: number; token: string } | undefined {
  const left = text.slice(0, caret);
  const m = left.match(/([@#]|[A-Z][A-Z0-9]+-)[A-Za-z0-9._/-]*$/);
  if (!m || m.index == null) return undefined;
  return { start: m.index, token: m[0] };
}

export function suggestions(token: string, issues: Issue[]): Suggest[] {
  const q = token.toLowerCase();
  if (token.startsWith("@")) {
    const users = new Set<string>(["me"]);
    for (const i of issues) for (const c of i.comments ?? []) if (c.author) users.add(c.author);
    return [...users]
      .filter((u) => `@${u}`.toLowerCase().includes(q))
      .map((u) => ({ id: `@${u}`, label: `@${u}` }))
      .slice(0, 8);
  }
  return issues
    .filter((i) => i.key.toLowerCase().includes(q.replace(/^#/, "")) || `#${i.key}`.toLowerCase().includes(q))
    .map((i) => ({ id: i.source === "github" ? `#${i.key}` : i.key, label: `${i.key} ${i.title}` }))
    .slice(0, 8);
}
