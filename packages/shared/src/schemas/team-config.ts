import { z } from "zod";
import { DEFAULT_LABEL_PREFIX } from "../meta.ts";

export const TeamRepoSchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
  defaultBranch: z.string().min(1).optional().default("main"),
  localPath: z.string().optional(),
  pinned: z.boolean().optional().default(false),
});

export const RolePromptsSchema = z
  .object({
    refiner: z.string().optional(),
    planner: z.string().optional(),
    implementer: z.string().optional(),
    reviewer: z.string().optional(),
  })
  .strict();

export const RoleModelsSchema = z
  .object({
    refiner: z.string().optional(),
    planner: z.string().optional(),
    implementer: z.string().optional(),
    reviewer: z.string().optional(),
  })
  .strict();

export const TeamConfigSchema = z
  .object({
    version: z.literal(1),
    repos: z.array(TeamRepoSchema).default([]),
    labelRules: z
      .object({
        prefix: z.string().min(1).default(DEFAULT_LABEL_PREFIX),
      })
      .default({ prefix: DEFAULT_LABEL_PREFIX }),
    prompts: RolePromptsSchema.optional(),
    models: RoleModelsSchema.optional(),
    jira: z
      .object({
        siteUrl: z.string().url().optional(),
        jql: z.string().optional(),
      })
      .optional(),
  })
  .strict();
export type TeamConfig = z.infer<typeof TeamConfigSchema>;
