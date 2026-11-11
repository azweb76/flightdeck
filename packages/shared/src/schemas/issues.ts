import { z } from "zod";
import { IssueSourceSchema, IssueStageSchema } from "./common.ts";

export const LinkedRepoSchema = z.object({
  owner: z.string(),
  name: z.string(),
  label: z.string().optional(),
  registered: z.boolean(),
});
export type LinkedRepo = z.infer<typeof LinkedRepoSchema>;

export const RepoLinkWarningSchema = z.enum(["none", "missing", "multiple"]);

export const IssueSchema = z.object({
  id: z.string(),
  source: IssueSourceSchema,
  key: z.string(),
  title: z.string(),
  body: z.string(),
  url: z.string(),
  stage: IssueStageSchema,
  repos: z.array(LinkedRepoSchema),
  repoWarning: RepoLinkWarningSchema,
  updatedAt: z.string(),
  needsYou: z.boolean().optional(),
  statusNote: z.string().optional(),
  latestRunId: z.number().optional(),
});
export type Issue = z.infer<typeof IssueSchema>;

export const IssueListQuerySchema = z.object({
  source: z.enum(["all", "jira", "github"]).optional().default("all"),
  repo: z.string().optional(),
});
export type IssueListQuery = z.infer<typeof IssueListQuerySchema>;
