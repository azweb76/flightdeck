import type { SetupCheck, SetupStatus } from "@flightdeck/shared";
import { detectClaudeConfig, type ClaudeDeps } from "../claude/index.ts";
import { defaultExec, type ExecFn } from "../exec/index.ts";
import { githubStatus } from "../github/index.ts";
import { createJiraClient } from "../jira/index.ts";
import { listRepos } from "../repos/index.ts";
import { createSecretStore } from "../secrets/index.ts";
import { getSettings } from "../settings/index.ts";

export type SetupDeps = {
  exec?: ExecFn;
  claude?: ClaudeDeps;
};

/** Canonical service: first-run checks with injectable exec. */
export async function runSetupChecks(deps: SetupDeps = {}): Promise<SetupStatus> {
  const exec = deps.exec ?? defaultExec;
  const git = await gitCheck(exec);
  const github = await githubStatus(exec);
  const claude = await detectClaudeConfig(deps.claude ?? { exec });
  const jira = await jiraCheck();
  const repos = repoCheck();
  const checks: SetupCheck[] = [
    git,
    {
      id: "gh",
      ok: github.installed && github.loggedIn,
      title: "GitHub CLI",
      detail: github.detail,
      hint: github.installed
        ? github.loggedIn
          ? undefined
          : "Fix: run `gh auth login`, then Re-check"
        : "Fix: install GitHub CLI from https://cli.github.com, then `gh auth login`",
    },
    {
      id: "claude",
      ok: claude.found && claude.apiKeyHelperOk !== false,
      title: "Claude Code config",
      detail: claude.detail,
      hint: claude.found
        ? undefined
        : "Fix: configure Claude Code (apiKeyHelper or ANTHROPIC_API_KEY, plus ANTHROPIC_BASE_URL if you use a gateway)",
    },
    jira,
    repos,
  ];
  const settings = getSettings();
  const requiredOk = git.ok && checks[1]!.ok && checks[2]!.ok;
  return {
    complete: settings.setupComplete && requiredOk,
    checks,
    claude,
    github,
  };
}

async function gitCheck(exec: ExecFn): Promise<SetupCheck> {
  const r = await exec("git", ["--version"], { timeoutMs: 5_000 });
  if (r.code !== 0) {
    return {
      id: "git",
      ok: false,
      title: "git",
      detail: "git was not found",
      hint: "Fix: install git and ensure it is on PATH",
    };
  }
  return { id: "git", ok: true, title: "git", detail: r.stdout.trim() };
}

async function jiraCheck(): Promise<SetupCheck> {
  const settings = getSettings();
  if (!settings.jiraSiteUrl || !settings.jiraEmail) {
    return {
      id: "jira",
      ok: false,
      title: "Jira Cloud",
      detail: "Not connected",
      hint: "Add your Jira site URL, email, and API token",
    };
  }
  const token = await createSecretStore().get();
  if (!token) {
    return {
      id: "jira",
      ok: false,
      title: "Jira Cloud",
      detail: "Site saved but the API token is missing",
      hint: "Re-enter the Jira API token",
    };
  }
  const test = await createJiraClient().test(settings.jiraSiteUrl, settings.jiraEmail, token);
  return {
    id: "jira",
    ok: test.ok,
    title: "Jira Cloud",
    detail: test.detail,
    hint: test.ok ? undefined : "Check the site URL, email, and API token",
  };
}

function repoCheck(): SetupCheck {
  const repos = listRepos();
  if (repos.length === 0) {
    return {
      id: "repos",
      ok: false,
      title: "Repositories",
      detail: "No repos registered",
      hint: "Add at least one GitHub repo (owner/name) and optionally clone it",
    };
  }
  return {
    id: "repos",
    ok: true,
    title: "Repositories",
    detail: `${repos.length} repo${repos.length === 1 ? "" : "s"} registered`,
  };
}
