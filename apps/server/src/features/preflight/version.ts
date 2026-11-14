export function parseTriple(raw: string): [number, number, number] | undefined {
  const m = stripAppleGit(raw).replace(/^v/i, "").match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!m) return undefined;
  return [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)];
}

export function parseGitVersion(raw: string): [number, number, number] | undefined {
  const labeled = stripAppleGit(raw).match(/git version\s+(\d+\.\d+(?:\.\d+)?)/i);
  return parseTriple(labeled?.[1] ?? stripAppleGit(raw));
}

function stripAppleGit(raw: string): string {
  return raw.replace(/\(Apple Git-\d+\)/gi, " ");
}

export function minFromRange(range: string): [number, number, number] | undefined {
  const trimmed = range.trim();
  const ge = trimmed.match(/^>=\s*v?(\d+\.\d+(?:\.\d+)?)/);
  return parseTriple(ge?.[1] ?? trimmed);
}

export function meetsMin(version: string, range: string): boolean {
  const v = parseTriple(version);
  const min = minFromRange(range);
  if (!v || !min) return false;
  for (let i = 0; i < 3; i += 1) {
    if (v[i]! !== min[i]!) return v[i]! > min[i]!;
  }
  return true;
}

export function formatTriple(v: [number, number, number]): string {
  return v.join(".");
}
