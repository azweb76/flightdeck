/** Pull a JSON object out of model text (fenced or first brace block). */
export function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] ?? longestBraceBlock(text)).trim();
  if (!raw) throw new Error("No JSON object in agent output");
  return JSON.parse(raw) as unknown;
}

export function parseAgentJson<T>(
  text: string,
  parse: (value: unknown) => T,
): T {
  return parse(extractJsonObject(text));
}

function longestBraceBlock(text: string): string {
  const start = text.indexOf("{");
  if (start < 0) return "";
  let depth = 0;
  let end = -1;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  return end < 0 ? "" : text.slice(start, end + 1);
}
