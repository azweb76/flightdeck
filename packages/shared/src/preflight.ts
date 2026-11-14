import { z } from "zod";

export const PreflightSeveritySchema = z.enum(["required", "optional"]);
export type PreflightSeverity = z.infer<typeof PreflightSeveritySchema>;

export const PreflightStatusSchema = z.enum(["pass", "fail", "warn", "skip"]);
export type PreflightStatus = z.infer<typeof PreflightStatusSchema>;

export const PreflightGateSchema = z.enum(["shape", "start", "saveGithub", "saveJira"]);
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
  return report.checks.find((check) => !check.ok && check.severity === "required" && check.gates?.includes(gate));
}
