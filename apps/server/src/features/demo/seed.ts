import { createRepo, listRepos } from "../repos/index.ts";
import { startDemoReview } from "../pr-review/index.ts";
import { insertRun, insertEvent, listRuns } from "../runs/store.ts";
import { insertGoal, listGoals } from "../goals/store.ts";
import { reviewSession } from "../improvements/index.ts";
import { notify } from "../notify/index.ts";
import { patchSettings } from "../settings/index.ts";

export async function seedDemo(): Promise<void> {
  if (process.env.FLIGHTDECK_DEMO !== "1") return;
  patchSettings({ setupComplete: true });
  if (listRepos().length === 0) {
    createRepo({ owner: "acme", name: "web", pinned: true, defaultBranch: "main" });
    createRepo({ owner: "acme", name: "api", pinned: true, defaultBranch: "main" });
    createRepo({ owner: "acme", name: "docs", pinned: false, defaultBranch: "main" });
  }
  if (listGoals("jira:PROJ-150").length === 0) {
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
  if (listRuns().length === 0) {
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
    insertEvent({
      runId: run.id,
      role: "planner",
      kind: "text",
      title: "Planner finished",
      detail: "Add /v2 only if we must break clients.",
      at: now,
    });
    insertEvent({
      runId: run.id,
      role: "implementer",
      kind: "tool",
      title: "Edit",
      tool: "Edit",
      path: "src/middleware/rateLimit.ts",
      detail: "",
      at: now,
    });
    await notify("Needs you", "PROJ-142 asked whether endpoints go under /v2.", `/runs/${run.id}`);
    startDemoReview();
    try {
      reviewSession(run.id);
    } catch {
      /* seed best-effort */
    }
  }
}
