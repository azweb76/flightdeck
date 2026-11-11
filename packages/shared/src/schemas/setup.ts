import { z } from "zod";

export const SetupCheckIdSchema = z.enum(["git", "gh", "claude", "jira", "repos"]);
export type SetupCheckId = z.infer<typeof SetupCheckIdSchema>;

export const SetupCheckSchema = z.object({
  id: SetupCheckIdSchema,
  ok: z.boolean(),
  title: z.string(),
  detail: z.string(),
  hint: z.string().optional(),
});
export type SetupCheck = z.infer<typeof SetupCheckSchema>;

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

export const SetupStatusSchema = z.object({
  complete: z.boolean(),
  checks: z.array(SetupCheckSchema),
  claude: ClaudeStatusSchema,
  github: GithubStatusSchema,
});
export type SetupStatus = z.infer<typeof SetupStatusSchema>;

export const ConnectJiraSchema = z.object({
  siteUrl: z.string().url(),
  email: z.string().email(),
  apiToken: z.string().min(1),
});
export type ConnectJira = z.infer<typeof ConnectJiraSchema>;
