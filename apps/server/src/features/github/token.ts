import type { GithubTokenSource } from "@flightdeck/shared";
import { GITHUB_TOKEN_ACCOUNT, createSecretStore } from "../secrets/index.ts";

export type ResolvedGithubToken = { token: string; source: GithubTokenSource };

/** Env only. Never log the value. */
export function envGithubToken(): ResolvedGithubToken | undefined {
  const github = process.env.GITHUB_TOKEN?.trim();
  if (github) return { token: github, source: "GITHUB_TOKEN" };
  const gh = process.env.GH_TOKEN?.trim();
  if (gh) return { token: gh, source: "GH_TOKEN" };
  return undefined;
}

export async function resolveGithubToken(): Promise<ResolvedGithubToken | undefined> {
  const fromEnv = envGithubToken();
  if (fromEnv) return fromEnv;
  const store = createSecretStore();
  const token = await store.get(GITHUB_TOKEN_ACCOUNT);
  if (!token?.trim()) return undefined;
  const storage = await store.storage(GITHUB_TOKEN_ACCOUNT);
  return { token: token.trim(), source: storage === "keychain" ? "keychain" : "file" };
}
