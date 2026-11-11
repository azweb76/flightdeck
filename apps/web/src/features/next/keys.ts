export type NextKey =
  | { kind: "down" }
  | { kind: "up" }
  | { kind: "expand" }
  | { kind: "option"; n: number };

export function nextKeyAction(key: string, typing: boolean): NextKey | undefined {
  if (typing) return undefined;
  if (key === "j") return { kind: "down" };
  if (key === "k") return { kind: "up" };
  if (key === "Enter") return { kind: "expand" };
  const n = Number(key);
  if (n >= 1 && n <= 9) return { kind: "option", n };
  return undefined;
}
