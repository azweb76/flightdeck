import { GITHUB_NEEDED_SCOPES } from "@flightdeck/shared";

export function parseScopeHeader(header: string | undefined | null): string[] {
  if (!header?.trim()) return [];
  return header
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function missingScopes(have: string[]): string[] {
  const set = new Set(have);
  return GITHUB_NEEDED_SCOPES.filter((s) => !set.has(s));
}

export function headerOf(headers: { get?: (name: string) => string | null; [key: string]: unknown }, name: string): string | undefined {
  if (typeof headers.get === "function") return headers.get(name) ?? undefined;
  const rec = headers as Record<string, unknown>;
  const v = rec[name] ?? rec[name.toLowerCase()];
  return typeof v === "string" ? v : undefined;
}
