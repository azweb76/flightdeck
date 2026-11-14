import type { PreflightCheck, PreflightReport } from "@flightdeck/shared";

const MARK: Record<PreflightCheck["status"], string> = {
  pass: "✓",
  fail: "✗",
  warn: "!",
  skip: "·",
};

export function formatPreflight(report: PreflightReport): string {
  const lines = ["Flightdeck preflight"];
  for (const check of report.checks) {
    lines.push(`  ${MARK[check.status]} ${check.label}  ${check.detail}`);
    if (check.fix && !check.ok) lines.push(`      Fix: ${check.fix}`);
  }
  if (report.ok) lines.push("All required checks passed.");
  else lines.push("Required checks failed. The API will still start so you can fix these in the UI.");
  return lines.join("\n");
}

export function printPreflight(report: PreflightReport): void {
  console.info(formatPreflight(report));
}
