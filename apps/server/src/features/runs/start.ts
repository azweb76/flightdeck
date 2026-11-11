import { jiraProjectKey, type Issue, type Run, type StartRun } from "@flightdeck/shared";
import { getSettings } from "../settings/index.ts";
import { getRepo } from "../repos/index.ts";
import { getIssue, isOffline, OfflineError } from "../issues/index.ts";
import { touchRecent } from "../catalog/index.ts";
import { NeedRepoError, ensureRepoRow, lastProjectRepo, rememberIssuePick, rememberedIssuePick } from "../discovery/index.ts";
import { ensureClone } from "../clone/index.ts";
import { publish } from "../events/index.ts";
import { getRun, insertRun, queuedRunIds, updateRun } from "./store.ts";
import { executeQueued } from "./execute-queued.ts";
import { spendStatus } from "./spend.ts";

const inFlight = new Set<number>();

export async function startRun(input: StartRun): Promise<Run> {
  const issue = await getIssue(input.issueId);
  if (!issue) throw new Error("Issue not found");
  if (isOffline(issue.source) && process.env.FLIGHTDECK_DEMO !== "1") throw new OfflineError();
  const repo = pickRepo(issue, input.repoId, input.repoSlug);
  rememberIssuePick(issue.id, repo.owner, repo.name);
  if (process.env.FLIGHTDECK_DEMO !== "1") await ensureClone(repo.owner, repo.name);
  const settings = getSettings();
  const now = new Date().toISOString();
  const run = insertRun({
    issueId: issue.id,
    issueKey: issue.key,
    issueTitle: issue.title,
    issueSource: issue.source,
    issueUrl: issue.url,
    repoId: getRepo(repo.id)?.id ?? repo.id,
    repoSlug: `${repo.owner}/${repo.name}`,
    branch: "agent/pending",
    worktreePath: "",
    phase: "plan",
    round: 0,
    maxRounds: settings.reviewRounds,
    status: "queued",
    costUsd: 0,
    capUsd: settings.dollarCapUsd,
    prDraft: settings.prDraft,
    createdAt: now,
    updatedAt: now,
  });
  enqueue(run.id);
  touchRecent(repo.owner, repo.name);
  return run;
}

export function enqueue(id: number): void {
  const run = getRun(id);
  if (run && run.status !== "queued" && run.status !== "running") {
    updateRun(id, { status: "queued", pauseReason: null });
  }
  publish("runs.updated");
  pump();
}

/** Start every queued run immediately. Spend cap pauses new starts only. */
export function pump(): void {
  if (spendStatus().blocked) {
    publish("runs.updated");
    return;
  }
  for (const id of queuedRunIds()) {
    if (inFlight.has(id)) continue;
    inFlight.add(id);
    void executeQueued(id).finally(() => {
      inFlight.delete(id);
      if (queuedRunIds().length) pump();
    });
  }
}

function pickRepo(issue: Issue, repoId?: number, repoSlug?: string) {
  if (repoSlug) {
    const [owner, name] = repoSlug.split("/");
    if (owner && name) return ensureRepoRow(owner, name);
  }
  if (repoId) {
    const r = getRepo(repoId);
    if (!r) throw new Error("Repo not found");
    return r;
  }
  if (issue.repos.length === 1 && issue.repos[0]) {
    return ensureRepoRow(issue.repos[0].owner, issue.repos[0].name);
  }
  const remembered = rememberedIssuePick(issue.id) ?? lastProjectRepo(jiraProjectKey(issue.key));
  if (remembered) return ensureRepoRow(remembered.owner, remembered.name);
  const guesses = (issue.repoGuesses ?? issue.repos).map((r) => ({ owner: r.owner, name: r.name }));
  throw new NeedRepoError(guesses, jiraProjectKey(issue.key));
}
