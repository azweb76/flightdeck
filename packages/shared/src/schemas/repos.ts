import { z } from "zod";

export const RepoPermissionSchema = z.enum(["ADMIN", "MAINTAIN", "WRITE", "TRIAGE", "READ"]);
export type RepoPermission = z.infer<typeof RepoPermissionSchema>;

export const CatalogRepoSchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  private: z.boolean(),
  defaultBranch: z.string().min(1),
  pushedAt: z.string().default(""),
  permission: RepoPermissionSchema.default("READ"),
  favorite: z.boolean().default(false),
  lastUsedAt: z.string().optional(),
});
export type CatalogRepo = z.infer<typeof CatalogRepoSchema>;

export const RepoSchema = z.object({
  id: z.number().int().positive(),
  owner: z.string().min(1),
  name: z.string().min(1),
  localPath: z.string(),
  defaultBranch: z.string().min(1),
  pinned: z.boolean(),
  createdAt: z.string(),
  instructions: z.string().default(""),
  setupCommand: z.string().default(""),
  testCommand: z.string().default(""),
  commitConvention: z.string().default("fix"),
  modelOverride: z.string().default(""),
});
export type Repo = z.infer<typeof RepoSchema>;

export const CreateRepoSchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
  localPath: z.string().optional().default(""),
  defaultBranch: z.string().min(1).optional().default("main"),
  pinned: z.boolean().optional().default(false),
  clone: z.boolean().optional().default(false),
});
export type CreateRepo = z.input<typeof CreateRepoSchema>;

export const PatchRepoSchema = z.object({
  localPath: z.string().optional(),
  defaultBranch: z.string().min(1).optional(),
  pinned: z.boolean().optional(),
  instructions: z.string().optional(),
  setupCommand: z.string().optional(),
  testCommand: z.string().optional(),
  commitConvention: z.string().optional(),
  modelOverride: z.string().optional(),
});
export type PatchRepo = z.infer<typeof PatchRepoSchema>;
