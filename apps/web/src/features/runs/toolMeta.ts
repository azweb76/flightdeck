import type { TranscriptEvent } from "@flightdeck/shared";

export type ToolMeta = {
  command?: string;
  additions?: number;
  deletions?: number;
  input?: string;
  output?: string;
};

export function parseToolMeta(event: TranscriptEvent): ToolMeta {
  const raw = event.detail?.trim() ?? "";
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as ToolMeta;
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      /* plain text */
    }
  }
  if (event.kind === "tool_result") return { output: raw || undefined };
  return raw ? { input: raw } : {};
}

export function lineDelta(oldS: string, newS: string): { additions: number; deletions: number } {
  const oldLines = oldS.split("\n");
  const newLines = newS.split("\n");
  return {
    additions: newLines.filter((l) => !oldLines.includes(l)).length,
    deletions: oldLines.filter((l) => !newLines.includes(l)).length,
  };
}

export function truncate(text: string, max = 2000): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n…`;
}

export function formatDuration(start: string, end: string): string {
  const ms = Math.max(0, Date.parse(end) - Date.parse(start));
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

export function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
