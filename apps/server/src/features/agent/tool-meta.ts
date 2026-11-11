export function toolPath(input: Record<string, unknown>): string | undefined {
  const path = pickStr(input, ["path", "file_path", "filePath"]);
  const command = pickStr(input, ["command"]);
  return path || command;
}

export function toolDetail(name: string | undefined, input: Record<string, unknown>): string {
  const command = pickStr(input, ["command"]);
  const oldS = pickStr(input, ["old_string", "oldString"]);
  const newS = pickStr(input, ["new_string", "newString"]);
  const delta = oldS != null && newS != null ? lineDelta(oldS, newS) : {};
  const outputDiff =
    name?.toLowerCase() === "edit" && oldS != null && newS != null ? unifiedPreview(oldS, newS) : undefined;
  return JSON.stringify({
    command,
    ...delta,
    input: inputPreview(name, input),
    output: outputDiff,
  });
}

export function resultDetail(content: unknown): string {
  const text = typeof content === "string" ? content : JSON.stringify(content ?? "");
  const clipped = text.length > 4000 ? `${text.slice(0, 4000)}\n…` : text;
  return JSON.stringify({ output: clipped });
}

export function lineDelta(oldS: string, newS: string): { additions: number; deletions: number } {
  const oldLines = oldS.split("\n");
  const newLines = newS.split("\n");
  return {
    additions: newLines.filter((l) => !oldLines.includes(l)).length,
    deletions: oldLines.filter((l) => !newLines.includes(l)).length,
  };
}

function pickStr(input: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = input[key];
    if (typeof v === "string" && v.length) return v;
  }
  return undefined;
}

function inputPreview(name: string | undefined, input: Record<string, unknown>): string | undefined {
  if (name?.toLowerCase() === "bash") return pickStr(input, ["command"]);
  if (name?.toLowerCase() === "grep") return pickStr(input, ["pattern", "query"]);
  const path = pickStr(input, ["path", "file_path", "filePath"]);
  return path;
}

function unifiedPreview(oldS: string, newS: string): string {
  const oldLines = oldS.split("\n");
  const newLines = newS.split("\n");
  const out = ["--- a", "+++ b"];
  for (const line of oldLines.filter((l) => !newLines.includes(l))) out.push(`-${line}`);
  for (const line of newLines.filter((l) => !oldLines.includes(l))) out.push(`+${line}`);
  return out.join("\n");
}
