import type { Repo } from "@flightdeck/shared";
import { createGithubClient } from "../github/index.ts";
import { rememberIssue } from "./index.ts";

export async function draftIssue(repo: Repo, title: string, body: string): Promise<{ id: string }> {
  if (process.env.FLIGHTDECK_DEMO === "1") {
    const id = `github:${repo.owner}/${repo.name}#draft`;
    rememberIssue({
      id,
      source: "github",
      key: `${repo.owner}/${repo.name}#draft`,
      title,
      body,
      url: "",
      stage: "new",
      repos: [{ owner: repo.owner, name: repo.name, registered: true }],
      repoWarning: "none",
      updatedAt: new Date().toISOString(),
    });
    return { id };
  }
  const created = await createGithubClient().createIssue(repo.owner, repo.name, title, body);
  const id = `github:${repo.owner}/${repo.name}#${created.number}`;
  rememberIssue({
    id,
    source: "github",
    key: `${repo.owner}/${repo.name}#${created.number}`,
    title,
    body,
    url: created.url,
    stage: "new",
    repos: [{ owner: repo.owner, name: repo.name, registered: true }],
    repoWarning: "none",
    updatedAt: new Date().toISOString(),
  });
  return { id };
}
