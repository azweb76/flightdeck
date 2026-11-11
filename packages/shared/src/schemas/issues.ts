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

export const PrRoleSchema = z.enum(["mine", "review"]);
export type PrRole = z.infer<typeof PrRoleSchema>;

export const PrCiSchema = z.enum(["passing", "failing", "pending"]);
export type PrCi = z.infer<typeof PrCiSchema>;

export const PrReviewStateSchema = z.enum(["approved", "changes_requested", "pending"]);
export type PrReviewState = z.infer<typeof PrReviewStateSchema>;

export const PrLifecycleSchema = z.enum(["open", "merged", "closed"]);
export type PrLifecycle = z.infer<typeof PrLifecycleSchema>;

export const PrColumnSchema = z.enum([
  "draft",
  "ci_failing",
  "changes_requested",
  "needs_review",
  "approved",
  "merged_closed",
]);
export type PrColumn = z.infer<typeof PrColumnSchema>;

export const BoardPrSchema = z.object({
  id: z.string(),
  number: z.number().int(),
  title: z.string(),
  url: z.string(),
  repo: z.string(),
  role: PrRoleSchema,
  ci: PrCiSchema,
  review: PrReviewStateSchema,
  unresolvedThreads: z.number().int().nonnegative().default(0),
  draft: z.boolean(),
  ageDays: z.number().nonnegative(),
  headRef: z.string(),
  headRepo: z.string(),
  viewerCanPush: z.boolean(),
  isFork: z.boolean(),
  body: z.string().default(""),
  createdAt: z.string(),
  updatedAt: z.string(),
  linkedIssueIds: z.array(z.string()).default([]),
  state: PrLifecycleSchema.default("open"),
});
export type BoardPr = z.infer<typeof BoardPrSchema>;

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
  parentId: z.string().optional(),
  repoGuesses: z.array(LinkedRepoSchema).optional(),
  comments: z
    .array(
      z.object({
        id: z.string(),
        author: z.string(),
        body: z.string(),
        createdAt: z.string(),
      }),
    )
    .optional(),
  viaPr: z.boolean().optional(),
  prs: z.array(BoardPrSchema).optional(),
});
export type Issue = z.infer<typeof IssueSchema>;

export const PrSyncDiagSchema = z.object({
  syncedAt: z.string().optional(),
  viewerLogin: z.string().optional(),
  query: z.string().optional(),
  authored: z.number().int().nonnegative().default(0),
  reviewRequested: z.number().int().nonnegative().default(0),
  total: z.number().int().nonnegative().default(0),
  mergedClosed: z.number().int().nonnegative().default(0),
  error: z.string().optional(),
});
export type PrSyncDiag = z.infer<typeof PrSyncDiagSchema>;

export const IssueListQuerySchema = z.object({
  source: z.enum(["all", "jira", "github"]).optional().default("all"),
  repo: z.string().optional(),
  refresh: z.enum(["0", "1", "true", "false"]).optional(),
});
export type IssueListQuery = z.infer<typeof IssueListQuerySchema>;
