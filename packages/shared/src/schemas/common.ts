import { z } from "zod";

export const ThemeModeSchema = z.enum(["system", "light", "dark"]);
export type ThemeMode = z.infer<typeof ThemeModeSchema>;

export const IssueSourceSchema = z.enum(["jira", "github"]);
export type IssueSource = z.infer<typeof IssueSourceSchema>;

export const IssueStageSchema = z.enum(["new", "refined", "running", "pr_open"]);
export type IssueStage = z.infer<typeof IssueStageSchema>;

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
