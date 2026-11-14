import type { CatalogRepo, GithubStatus } from "@flightdeck/shared";

export type GhIssue = {
  id: string;
  number: number;
  title: string;
  body: string;
  url: string;
  updatedAt: string;
  owner: string;
  name: string;
};

export type GithubClient = {
  status(): Promise<GithubStatus>;
  listAssignedIssues(): Promise<GhIssue[]>;
  listRepos(): Promise<CatalogRepo[]>;
  cloneRepo(owner: string, name: string, dest: string): Promise<{ ok: boolean; detail: string }>;
  createIssue(owner: string, name: string, title: string, body: string): Promise<{ number: number; url: string }>;
  updateIssue(owner: string, name: string, number: number, title: string, body: string): Promise<void>;
};

export type GithubDeps = {
  token?: string;
  fetch?: typeof fetch;
  exec?: import("../exec/index.ts").ExecFn;
};
