import { z } from "zod";

export const PreflightSeveritySchema = z.enum(["required", "optional"]);
export type PreflightSeverity = z.infer<typeof PreflightSeveritySchema>;

export const PreflightStatusSchema = z.enum(["pass", "fail", "warn", "skip"]);
export type PreflightStatus = z.infer<typeof PreflightStatusSchema>;

export const PreflightGateSchema = z.enum(["pickRepo", "refine", "start", "saveGithub", "saveJira"]);
export type PreflightGate = z.infer<typeof PreflightGateSchema>;

export const PreflightCheckSchema = z.object({
  id: z.string(),
  label: z.string(),
  severity: PreflightSeveritySchema,
  ok: z.boolean(),
  status: PreflightStatusSchema,
  detail: z.string(),
  fix: z.string().optional(),
  version: z.string().optional(),
  gates: z.array(PreflightGateSchema).optional(),
});
export type PreflightCheck = z.infer<typeof PreflightCheckSchema>;

export const PreflightReportSchema = z.object({
  ok: z.boolean(),
  checkedAt: z.string(),
  demo: z.boolean(),
  checks: z.array(PreflightCheckSchema),
});
export type PreflightReport = z.infer<typeof PreflightReportSchema>;

export function blockedBy(report: PreflightReport, gate: PreflightGate): PreflightCheck | undefined {
  return report.checks.find((check) => !check.ok && check.gates?.includes(gate));
}

const GATE_ACTION: Record<PreflightGate, string> = {
  pickRepo: "New idea",
  refine: "Refine",
  start: "Start",
  saveGithub: "GitHub save",
  saveJira: "Jira save",
};

export function gatedActionNames(report: PreflightReport): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const gate of PreflightGateSchema.options) {
    if (!blockedBy(report, gate)) continue;
    const name = GATE_ACTION[gate];
    if (seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }
  return names;
}

export function stayOffCopy(report: PreflightReport): string {
  const names = gatedActionNames(report);
  if (!names.length) return "Flightdeck can still run.";
  const verb = names.length === 1 ? "stays" : "stay";
  return `Flightdeck can still run, but ${joinEnglish(names)} ${verb} off until the required tools are ready.`;
}

function joinEnglish(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
