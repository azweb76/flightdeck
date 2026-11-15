import type { ReviewComment } from "@flightdeck/shared";

export type DiffLine = { path: string; line: number; side: "LEFT" | "RIGHT" };

export function linesFromPatch(path: string, patch: string): DiffLine[] {
  const lines: DiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;
  for (const raw of patch.split("\n")) {
    const hunk = raw.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      continue;
    }
    if (raw.startsWith("\\") || raw.startsWith("diff ") || raw.startsWith("index ")) continue;
    if (raw.startsWith("+")) {
      lines.push({ path, line: newLine, side: "RIGHT" });
      newLine += 1;
      continue;
    }
    if (raw.startsWith("-")) {
      lines.push({ path, line: oldLine, side: "LEFT" });
      oldLine += 1;
      continue;
    }
    if (raw === "") continue;
    if (raw.startsWith(" ")) {
      lines.push({ path, line: newLine, side: "RIGHT" });
      lines.push({ path, line: oldLine, side: "LEFT" });
      oldLine += 1;
      newLine += 1;
    }
  }
  return lines;
}

export function placeComments<T extends Omit<ReviewComment, "id"> | ReviewComment>(
  comments: T[],
  files: { filename: string; patch?: string; previous_filename?: string }[],
): T[] {
  const exact = new Map<string, DiffLine>();
  const byPathLine = new Map<string, DiffLine>();
  for (const file of files) {
    for (const line of linesFromPatch(file.filename, file.patch ?? "")) {
      rememberLine(exact, byPathLine, line);
      if (file.previous_filename) rememberLine(exact, byPathLine, line, file.previous_filename);
    }
  }
  return comments.map((comment) => {
    const hit = exact.get(key(comment.path, comment.line, comment.side)) ?? byPathLine.get(`${comment.path}:${comment.line}`);
    if (!hit) return { ...comment, placement: "summary" as const };
    return { ...comment, path: hit.path, line: hit.line, side: hit.side, placement: "inline" as const };
  });
}

export function summaryNotes(comments: { path: string; line: number; body: string; placement?: string; state?: string }[]): string {
  const notes = comments.filter((c) => c.placement === "summary" && c.state === "approved");
  if (!notes.length) return "";
  return [
    "Notes not attached to the diff:",
    ...notes.map((c) => `- ${c.path}:${c.line}: ${c.body}`),
  ].join("\n");
}

/** Trailing baked-in block from older drafts. Leaves the same header mid-summary alone. */
const NOTES_BLOCK = /(?:\n\n)?Notes not attached to the diff:\n(?:- .+\n?)*$/;

/** Claude's summary plus approved off-diff notes. Strips a baked-in notes block from older drafts. */
export function githubReviewBody(
  summary: string,
  comments: { path: string; line: number; body: string; placement?: string; state?: string }[],
): string {
  const claude = summary.replace(NOTES_BLOCK, "").trim();
  return [claude, summaryNotes(comments)].filter(Boolean).join("\n\n");
}

function rememberLine(
  exact: Map<string, DiffLine>,
  byPathLine: Map<string, DiffLine>,
  line: DiffLine,
  alias = line.path,
): void {
  exact.set(key(alias, line.line, line.side), line);
  const pl = `${alias}:${line.line}`;
  if (!byPathLine.has(pl) || line.side === "RIGHT") byPathLine.set(pl, line);
}

function key(path: string, line: number, side: string): string {
  return `${path}:${side}:${line}`;
}
