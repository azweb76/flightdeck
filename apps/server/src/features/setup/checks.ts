import type { SetupCheck, SetupStatus } from "@flightdeck/shared";
import { SetupStatusSchema } from "@flightdeck/shared";
import { cacheGet, cacheSet } from "../cache/index.ts";
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
  probeJira?: boolean;
  refreshGithub?: boolean;
};

const EMPTY_CLAUDE = { found: false, apiKeyHelper: false, sources: [] as string[], detail: "Not checked yet" };
const EMPTY_GH = { installed: false, loggedIn: false, detail: "Not checked yet" };

/** SQLite-only snapshot for page load. Never runs gh, Keychain, or Jira. */
export function readSetupStatus(): SetupStatus {
  const settings = getSettings();
  const demo = process.env.FLIGHTDECK_DEMO === "1";
  const complete = Boolean(settings.setupComplete || demo);
  const row = cacheGet("setup:last");
  if (row) {
    try {
      const parsed = SetupStatusSchema.safeParse(JSON.parse(row.body) as unknown);
      if (parsed.success) return { ...parsed.data, complete };
    } catch {
      /* ignore corrupt cache */
    }
  }
  return { complete, checks: [], claude: EMPTY_CLAUDE, github: EMPTY_GH };
}

/** Live checks for Recheck / complete. Probe Jira and refresh gh cache. */
export async function runSetupChecks(deps: SetupDeps = {}): Promise<SetupStatus> {
  const exec = deps.exec ?? defaultExec;
  const probeJira = deps.probeJira !== false;
  const [git, github, claude, jira] = await Promise.all([
    gitCheck(exec),
    githubStatus(exec, deps.refreshGithub !== false),
    detectClaudeConfig(deps.claude ?? { exec }),
    jiraCheck(probeJira),
  ]);
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
  const demo = process.env.FLIGHTDECK_DEMO === "1";
  const status: SetupStatus = {
    complete: settings.setupComplete && (requiredOk || demo),
    checks,
    claude,
    github,
  };
  cacheSet("setup:last", JSON.stringify(status));
  return status;
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

async function jiraCheck(probe: boolean): Promise<SetupCheck> {
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
  if (!probe) {
    return {
      id: "jira",
      ok: settings.jiraConfigured,
      title: "Jira Cloud",
      detail: settings.jiraConfigured ? "Saved (use Test and save to verify)" : "Not connected",
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
