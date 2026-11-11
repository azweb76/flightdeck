import { createRepo, listRepos } from "../repos/index.ts";
import { startDemoReview } from "../pr-review/index.ts";
import { insertRun, listRuns, updateRun } from "../runs/store.ts";
import { seedAskingTranscript } from "./seedTranscript.ts";
import { insertGoal, listGoals } from "../goals/store.ts";
import { insertQuestion } from "../questions/index.ts";
import { reviewSession } from "../improvements/index.ts";
import { notify } from "../notify/index.ts";
import { patchSettings } from "../settings/index.ts";
import { demoIssues } from "../issues/demo.ts";
import { upsertIssue } from "../issues/store.ts";
import { seedBoardPrs } from "./seed-prs.ts";
import { applyBoardPrs, listBoardPrs } from "../board-prs/index.ts";
import { loadIssues } from "../issues/store.ts";

export async function seedDemo(): Promise<void> {
  if (process.env.FLIGHTDECK_DEMO !== "1") return;
  patchSettings({ setupComplete: true });
  if (listRepos().length === 0) {
    createRepo({ owner: "acme", name: "web", pinned: true, defaultBranch: "main" });
    createRepo({ owner: "acme", name: "api", pinned: true, defaultBranch: "main" });
    createRepo({ owner: "acme", name: "docs", pinned: false, defaultBranch: "main" });
  }
  for (const issue of demoIssues()) upsertIssue(issue);
  seedBoardPrs();
  applyBoardPrs(loadIssues(), listBoardPrs(), true, true);
  seedApprovedGoal();
  await seedRuns();
}

function seedApprovedGoal(): void {
  if (listGoals("jira:PROJ-150").length > 0) return;
  const now = new Date().toISOString();
  insertGoal({
    issueId: "jira:PROJ-150",
    originalBody: "Add a CSV export of invoices for finance.",
    markdown: "## Goal\nExport invoices as CSV.\n\n## Acceptance criteria\n- GET /export returns CSV\n",
    status: "approved",
    createdAt: now,
    updatedAt: now,
  });
}

async function seedRuns(): Promise<void> {
  if (listRuns().length > 0) return;
  const now = new Date().toISOString();
  const run = insertRun({
    issueId: "jira:PROJ-142",
    issueKey: "PROJ-142",
    issueTitle: "Version the public API",
    issueSource: "jira",
    issueUrl: "https://example.atlassian.net/browse/PROJ-142",
    repoId: listRepos()[0]!.id,
    repoSlug: "acme/api",
    branch: "agent/PROJ-142",
    worktreePath: "/tmp/worktrees/PROJ-142",
    phase: "implement",
    round: 2,
    maxRounds: 2,
    status: "asking",
    costUsd: 1.84,
    capUsd: 10,
    prDraft: true,
    pauseReason: "Should the new endpoints go under /v2?",
    createdAt: now,
    updatedAt: now,
    startedAt: now,
  });
  seedAskingTranscript(run.id, now);
  const q = insertQuestion({
    runId: run.id,
    prompt: "Should the new endpoints go under /v2?",
    options: [
      { id: "yes", label: "Yes, /v2" },
      { id: "no", label: "Keep /v1 with headers" },
    ],
  });
  updateRun(run.id, { questionId: q.id });
  seedPrOpenRun(now);
  await notify("Needs you", "PROJ-142 asked whether endpoints go under /v2.", `/runs/${run.id}`);
  startDemoReview();
  try {
    reviewSession(run.id);
  } catch {
    /* seed best-effort */
  }
}

function seedPrOpenRun(now: string): void {
  insertRun({
    issueId: "github:acme/docs#88",
    issueKey: "acme/docs#88",
    issueTitle: "Fix broken links in docs",
    issueSource: "github",
    issueUrl: "https://github.com/acme/docs/issues/88",
    repoId: listRepos().find((r) => r.name === "docs")?.id ?? listRepos()[0]!.id,
    repoSlug: "acme/docs",
    branch: "agent/docs-88",
    worktreePath: "/tmp/worktrees/docs-88",
    phase: "review",
    round: 2,
    maxRounds: 2,
    status: "completed",
    costUsd: 0.42,
    capUsd: 10,
    prDraft: true,
    prUrl: "https://github.com/acme/docs/pull/91",
    prNumber: 91,
    createdAt: now,
    updatedAt: now,
    startedAt: now,
    finishedAt: now,
  });
}
