import { z } from "zod";
import { DEFAULT_JIRA_JQL, DEFAULT_LABEL_PREFIX, DEFAULT_THEME } from "../meta.ts";
import { ThemeModeSchema } from "./common.ts";

export const SettingsSchema = z.object({
  jiraSiteUrl: z.string().optional().default(""),
  jiraEmail: z.string().optional().default(""),
  jiraConfigured: z.boolean().default(false),
  jiraJql: z.string().default(DEFAULT_JIRA_JQL),
  labelPrefix: z.string().min(1).default(DEFAULT_LABEL_PREFIX),
  theme: ThemeModeSchema.default(DEFAULT_THEME),
  workspaceFolder: z.string().default(""),
  setupComplete: z.boolean().default(false),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const SettingsPatchSchema = SettingsSchema.partial();
export type SettingsPatch = z.input<typeof SettingsPatchSchema>;
