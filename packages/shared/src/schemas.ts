import { z } from "zod";
import {
  DEFAULT_DAILY_DOLLAR_CAP_USD,
  DEFAULT_DOLLAR_CAP_USD,
  DEFAULT_JIRA_JQL,
  DEFAULT_MAX_CONCURRENT,
  DEFAULT_MODEL,
  DEFAULT_THEME,
} from "./meta.ts";
import { IssueDraftSchema } from "./draft.ts";

export const ThemeModeSchema = z.enum(["light", "dark", "system"]);
export type ThemeMode = z.infer<typeof ThemeModeSchema>;

export const SettingsSchema = z.object({
  jiraSiteUrl: z.string().default(""),
  jiraEmail: z.string().default(""),
  jiraConfigured: z.boolean().default(false),
  jiraJql: z.string().default(DEFAULT_JIRA_JQL),
  jiraProjectKey: z.string().default(""),
  theme: ThemeModeSchema.default(DEFAULT_THEME),
  workspaceFolder: z.string().default(""),
  dollarCapUsd: z.number().positive().default(DEFAULT_DOLLAR_CAP_USD),
  dailyDollarCapUsd: z.number().positive().default(DEFAULT_DAILY_DOLLAR_CAP_USD),
  maxConcurrentAgents: z.number().int().min(1).max(20).default(DEFAULT_MAX_CONCURRENT),
  model: z.string().default(DEFAULT_MODEL),
});
export type Settings = z.infer<typeof SettingsSchema>;
export const SettingsPatchSchema = SettingsSchema.partial();
export type SettingsPatch = z.input<typeof SettingsPatchSchema>;

export const IssueSourceSchema = z.enum(["jira", "github", "local"]);
export type IssueSource = z.infer<typeof IssueSourceSchema>;

export const IssueSchema = z.object({
  id: z.string(),
  source: IssueSourceSchema,
  key: z.string(),
  title: z.string(),
  body: z.string(),
  url: z.string().default(""),
  repoSlug: z.string().optional(),
  updatedAt: z.string(),
  saved: z.boolean().default(false),
});
export type Issue = z.infer<typeof IssueSchema>;

export const ClaudeStatusSchema = z.object({
  found: z.boolean(),
  apiKeyHelper: z.boolean(),
  apiKeyHelperOk: z.boolean().optional(),
  baseUrl: z.string().optional(),
  sources: z.array(z.string()),
  detail: z.string(),
});
export type ClaudeStatus = z.infer<typeof ClaudeStatusSchema>;

export const GithubStatusSchema = z.object({
  installed: z.boolean(),
  loggedIn: z.boolean(),
  user: z.string().optional(),
  detail: z.string(),
});
export type GithubStatus = z.infer<typeof GithubStatusSchema>;

export const CatalogRepoSchema = z.object({
  owner: z.string(),
  name: z.string(),
  localPath: z.string().default(""),
});
export type CatalogRepo = z.infer<typeof CatalogRepoSchema>;

export const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  text: z.string(),
  options: z.array(z.object({ id: z.string(), label: z.string() })).optional(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ShapeSessionSchema = z.object({
  id: z.string(),
  repoSlug: z.string(),
  issueId: z.string().optional(),
  status: z.enum(["idle", "running", "asking", "ready"]),
  draft: IssueDraftSchema,
  messages: z.array(ChatMessageSchema),
});
export type ShapeSession = z.infer<typeof ShapeSessionSchema>;

export const AppEventSchema = z.object({
  type: z.string(),
  at: z.string(),
  payload: z.unknown().optional(),
});
export type AppEvent = z.infer<typeof AppEventSchema>;
