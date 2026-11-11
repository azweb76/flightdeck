import { z } from "zod";
import {
  DEFAULT_DOLLAR_CAP_USD,
  DEFAULT_JIRA_JQL,
  DEFAULT_LABEL_PREFIX,
  DEFAULT_MAX_CONCURRENCY,
  DEFAULT_MODEL,
  DEFAULT_PERMISSION_MODE,
  DEFAULT_PR_DRAFT,
  DEFAULT_REVIEW_ROUNDS,
  DEFAULT_THEME,
  DEFAULT_BOARD_AUTHORED_PRS,
  DEFAULT_BOARD_REVIEW_PRS,
  DEFAULT_BOARD_LINKED_ISSUES,
} from "../meta.ts";
import { ThemeModeSchema } from "./common.ts";
import { PermissionModeSchema } from "./roles.ts";

export const SettingsSchema = z.object({
  jiraSiteUrl: z.string().optional().default(""),
  jiraEmail: z.string().optional().default(""),
  jiraConfigured: z.boolean().default(false),
  jiraJql: z.string().default(DEFAULT_JIRA_JQL),
  labelPrefix: z.string().min(1).default(DEFAULT_LABEL_PREFIX),
  theme: ThemeModeSchema.default(DEFAULT_THEME),
  workspaceFolder: z.string().default(""),
  setupComplete: z.boolean().default(false),
  reviewRounds: z.number().int().min(1).max(8).default(DEFAULT_REVIEW_ROUNDS),
  prDraft: z.boolean().default(DEFAULT_PR_DRAFT),
  dollarCapUsd: z.number().positive().default(DEFAULT_DOLLAR_CAP_USD),
  maxConcurrency: z.number().int().min(1).max(8).default(DEFAULT_MAX_CONCURRENCY),
  permissionMode: PermissionModeSchema.default(DEFAULT_PERMISSION_MODE),
  modelRefiner: z.string().default(DEFAULT_MODEL),
  modelPlanner: z.string().default(DEFAULT_MODEL),
  modelImplementer: z.string().default(DEFAULT_MODEL),
  modelReviewer: z.string().default(DEFAULT_MODEL),
  promptRefiner: z.string().default(""),
  promptPlanner: z.string().default(""),
  promptImplementer: z.string().default(""),
  promptReviewer: z.string().default(""),
  boardAuthoredPrs: z.boolean().default(DEFAULT_BOARD_AUTHORED_PRS),
  boardReviewPrs: z.boolean().default(DEFAULT_BOARD_REVIEW_PRS),
  boardLinkedIssues: z.boolean().default(DEFAULT_BOARD_LINKED_ISSUES),
  boardPrExcludeRepos: z.string().default(""),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const SettingsPatchSchema = SettingsSchema.partial();
export type SettingsPatch = z.input<typeof SettingsPatchSchema>;
