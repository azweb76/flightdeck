import { draftToMarkdown, type Issue, type ShapeSession } from "@flightdeck/shared";
import { createGithubClient } from "../github/index.ts";
import { createJiraClient } from "../jira/index.ts";
import { upsertIssue } from "../issues/store.ts";
import { createSecretStore } from "../secrets/index.ts";
import { getSettings } from "../settings/index.ts";
import { getSession, saveSession } from "./session.ts";
import { publish } from "../events/index.ts";

export async function saveShapedIssue(
  id: string,
  tracker: "jira" | "github",
  opts: { projectKey?: string; repoSlug?: string },
): Promise<Issue> {
  const session = getSession(id);
  if (!session) throw new Error("Session not found");
  if (!session.draft.title.trim()) throw new Error("Add a title before saving");
  const body = draftToMarkdown(session.draft);
  const issue =
    process.env.FLIGHTDECK_DEMO === "1"
      ? demoSave(session, tracker, body, opts)
      : tracker === "jira"
        ? await saveJira(session, body, opts.projectKey)
        : await saveGithub(session, body, opts.repoSlug ?? session.repoSlug);
  upsertIssue(issue);
  session.issueId = issue.id;
  saveSession(session);
  publish("issues.updated");
  return issue;
}

function demoSave(
  session: ShapeSession,
  tracker: "jira" | "github",
  body: string,
  opts: { projectKey?: string; repoSlug?: string },
): Issue {
  const now = new Date().toISOString();
  if (tracker === "jira") {
    const key = session.issueId?.startsWith("jira:")
      ? session.issueId.slice(5)
      : `${opts.projectKey || "PROJ"}-200`;
    return {
      id: `jira:${key}`,
      source: "jira",
      key,
      title: session.draft.title,
      body,
      url: `https://example.atlassian.net/browse/${key}`,
      updatedAt: now,
      saved: true,
    };
  }
  const slug = opts.repoSlug ?? session.repoSlug;
  const num = session.issueId?.includes("#") ? session.issueId.split("#")[1] : "201";
  return {
    id: `github:${slug}#${num}`,
    source: "github",
    key: `${slug}#${num}`,
    title: session.draft.title,
    body,
    url: `https://github.com/${slug}/issues/${num}`,
    repoSlug: slug,
    updatedAt: now,
    saved: true,
  };
}

async function saveJira(session: ShapeSession, body: string, projectKey?: string): Promise<Issue> {
  const settings = getSettings();
  const token = await createSecretStore().get();
  if (!settings.jiraSiteUrl || !settings.jiraEmail || !token) throw new Error("Connect Jira in Settings first");
  const client = createJiraClient();
  if (session.issueId?.startsWith("jira:")) {
    const key = session.issueId.slice(5);
    await client.updateIssue({
      siteUrl: settings.jiraSiteUrl,
      email: settings.jiraEmail,
      token,
      key,
      title: session.draft.title,
      body,
    });
    return {
      id: session.issueId,
      source: "jira",
      key,
      title: session.draft.title,
      body,
      url: `${settings.jiraSiteUrl.replace(/\/$/, "")}/browse/${key}`,
      updatedAt: new Date().toISOString(),
      saved: true,
    };
  }
  const project = projectKey || settings.jiraProjectKey;
  if (!project) throw new Error("Pick a Jira project key");
  const created = await client.createIssue({
    siteUrl: settings.jiraSiteUrl,
    email: settings.jiraEmail,
    token,
    projectKey: project,
    title: session.draft.title,
    body,
  });
  return {
    id: `jira:${created.key}`,
    source: "jira",
    key: created.key,
    title: session.draft.title,
    body,
    url: created.url,
    updatedAt: new Date().toISOString(),
    saved: true,
  };
}

async function saveGithub(session: ShapeSession, body: string, repoSlug: string): Promise<Issue> {
  const [owner, name] = repoSlug.split("/");
  if (!owner || !name) throw new Error("Pick a GitHub repo");
  const gh = createGithubClient();
  if (session.issueId?.startsWith("github:")) {
    const num = Number(session.issueId.split("#")[1]);
    await gh.updateIssue(owner, name, num, session.draft.title, body);
    return {
      id: session.issueId,
      source: "github",
      key: `${repoSlug}#${num}`,
      title: session.draft.title,
      body,
      url: `https://github.com/${repoSlug}/issues/${num}`,
      repoSlug,
      updatedAt: new Date().toISOString(),
      saved: true,
    };
  }
  const created = await gh.createIssue(owner, name, session.draft.title, body);
  return {
    id: `github:${repoSlug}#${created.number}`,
    source: "github",
    key: `${repoSlug}#${created.number}`,
    title: session.draft.title,
    body,
    url: created.url,
    repoSlug,
    updatedAt: new Date().toISOString(),
    saved: true,
  };
}
