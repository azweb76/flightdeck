const BLOCKED = [
  /\brm\s+-rf\s+\//,
  /\bsudo\b/,
  /\bmkfs\b/,
  /\bdd\s+if=/,
  /curl[^\n]*\|\s*(ba)?sh/,
  /\bshutdown\b/,
  /\breboot\b/,
];

export function isRiskyCommand(command: string): boolean {
  const c = command.toLowerCase();
  return BLOCKED.some((re) => re.test(c));
}

export function allowTool(name: string, input: Record<string, unknown>): boolean {
  if (name === "Bash" && typeof input.command === "string" && isRiskyCommand(input.command)) {
    return false;
  }
  return true;
}
