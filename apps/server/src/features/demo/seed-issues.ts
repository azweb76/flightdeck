import { draftToMarkdown, emptyDraft, type Issue, type IssueDraft } from "@flightdeck/shared";

const NOW = "2026-11-12T12:00:00.000Z";

function shaped(title: string, sections: Omit<IssueDraft, "title">): string {
  return draftToMarkdown({ ...emptyDraft(), title, ...sections });
}

function issue(
  partial: Omit<Issue, "updatedAt" | "saved" | "url" | "demo"> & { url: string; repoSlug?: string },
): Issue {
  return { ...partial, updatedAt: NOW, saved: true, demo: true };
}

export function seedIssues(): Issue[] {
  return [
    csvExport(),
    jiraCsv(),
    csvRefunds(),
    webhookRetry(),
    spendCap(),
    queueWeb(),
    parallelWeb(),
    waitingWeb(),
    capApi(),
    doneWeb(),
    sortCsv(),
  ];
}

function csvExport(): Issue {
  return issue({
    id: "github:acme/web#12",
    source: "github",
    key: "acme/web#12",
    title: "Export invoices as CSV",
    body: shaped("Export invoices as CSV", {
      goal: "Finance wants a CSV from the invoices page.",
      acceptance: "- CSV includes only paid invoices.\n- Download starts from the invoices page.",
      files: "src/invoices/export.ts, src/pages/Invoices.tsx",
      approach: "Add an export route and a download button.",
      outOfScope: "PDF export and email delivery.",
      testPlan: "Unit test CSV rows; click the download button.",
    }),
    url: "https://github.com/acme/web/issues/12",
    repoSlug: "acme/web",
  });
}

function jiraCsv(): Issue {
  return issue({
    id: "jira:PROJ-150",
    source: "jira",
    key: "PROJ-150",
    title: "Invoice CSV on the web app",
    body: shaped("Invoice CSV on the web app", {
      goal: "Need an export for finance on the web app.",
      acceptance: "- Same CSV as GitHub #12.\n- Repo is chosen before Start.",
      files: "apps/web invoices pages",
      approach: "Reuse the web export once a repo is picked.",
      outOfScope: "Native mobile export.",
      testPlan: "Save, pick acme/web, then Start.",
    }),
    url: "https://example.atlassian.net/browse/PROJ-150",
  });
}

function csvRefunds(): Issue {
  return issue({
    id: "github:acme/web#15",
    source: "github",
    key: "acme/web#15",
    title: "Clarify CSV refund rows",
    body: shaped("Clarify CSV refund rows", {
      goal: "Should refunded invoices appear in the export?",
      acceptance: "- Paid-only vs include-refunds is an explicit choice.\n- Headers match the chosen columns.",
      files: "src/invoices/export.ts",
      approach: "Ask Dan which rows to include, then filter.",
      outOfScope: "Chargeback handling.",
      testPlan: "Fixture with one paid and one refunded invoice.",
    }),
    url: "https://github.com/acme/web/issues/15",
    repoSlug: "acme/web",
  });
}

function webhookRetry(): Issue {
  return issue({
    id: "github:acme/web#21",
    source: "github",
    key: "acme/web#21",
    title: "Add retry to webhook handler",
    body: shaped("Add retry to webhook handler", {
      goal: "Webhooks fail too easily. Need retries and tests.",
      acceptance: "- Failed downstream POSTs are retried with backoff.\n- A 5xx then success sequence is covered by tests.",
      files: "src/webhooks/handler.ts",
      approach: "Exponential backoff with a small retry budget.",
      outOfScope: "Switching webhook providers.",
      testPlan: "Mock 5xx then 200; assert three attempts max.",
    }),
    url: "https://github.com/acme/web/issues/21",
    repoSlug: "acme/web",
  });
}

function spendCap(): Issue {
  return issue({
    id: "github:acme/api#8",
    source: "github",
    key: "acme/api#8",
    title: "Spend-cap sensitive refactor",
    body: shaped("Spend-cap sensitive refactor", {
      goal: "A large refactor that would blow the dollar cap in demo.",
      acceptance: "- The run stops when the per-run cap is hit.\n- Spend is visible on the change.",
      files: "apps/server/src/features/run",
      approach: "Script a large usage event during plan.",
      outOfScope: "Raising production caps automatically.",
      testPlan: "Start #8 and assert cap_hit with non-zero cost.",
    }),
    url: "https://github.com/acme/api/issues/8",
    repoSlug: "acme/api",
  });
}

function queueWeb(): Issue {
  return issue({
    id: "github:acme/web#40",
    source: "github",
    key: "acme/web#40",
    title: "Queue a second web change",
    body: shaped("Queue a second web change", {
      goal: "Start this while other agents are busy so it waits in the queue.",
      acceptance: "- Status is queued until a slot frees.",
      files: "apps/server/src/features/run",
      approach: "Same repo, own worktree.",
      outOfScope: "Skipping the queue.",
      testPlan: "Open Runs and see Queued.",
    }),
    url: "https://github.com/acme/web/issues/40",
    repoSlug: "acme/web",
  });
}

function parallelWeb(): Issue {
  return issue({
    id: "github:acme/web#41",
    source: "github",
    key: "acme/web#41",
    title: "Parallel checkout on the same repo",
    body: shaped("Parallel checkout on the same repo", {
      goal: "A second worktree on acme/web that can resume after restart.",
      acceptance: "- Own worktree under the app clone folder.\n- Resume continues the run.",
      files: "apps/server/src/features/run/worktree.ts",
      approach: "git worktree add a unique branch.",
      outOfScope: "Sharing one worktree.",
      testPlan: "Click Resume on Runs.",
    }),
    url: "https://github.com/acme/web/issues/41",
    repoSlug: "acme/web",
  });
}

function waitingWeb(): Issue {
  return issue({
    id: "github:acme/web#42",
    source: "github",
    key: "acme/web#42",
    title: "Waiting on an export choice",
    body: shaped("Waiting on an export choice", {
      goal: "Paused for Dan, still holding a concurrent slot.",
      acceptance: "- Needs you is visible on Runs.",
      files: "src/invoices/export.ts",
      approach: "Ask, then continue.",
      outOfScope: "Guessing the answer.",
      testPlan: "Reply from change detail.",
    }),
    url: "https://github.com/acme/web/issues/42",
    repoSlug: "acme/web",
  });
}

function capApi(): Issue {
  return issue({
    id: "github:acme/api#43",
    source: "github",
    key: "acme/api#43",
    title: "Already hit the spend cap",
    body: shaped("Already hit the spend cap", {
      goal: "Show a clean cap-hit on the Runs list.",
      acceptance: "- Cap hit is visible with a non-zero cost.",
      files: "apps/server/src/features/run/caps.ts",
      approach: "Stop when the cap is crossed.",
      outOfScope: "Auto-raising caps.",
      testPlan: "Open the cap-hit run.",
    }),
    url: "https://github.com/acme/api/issues/43",
    repoSlug: "acme/api",
  });
}

function doneWeb(): Issue {
  return issue({
    id: "github:acme/web#44",
    source: "github",
    key: "acme/web#44",
    title: "Shipped the first CSV",
    body: shaped("Shipped the first CSV", {
      goal: "A finished run on the same repo as the queued one.",
      acceptance: "- Status is Done with a draft PR link.",
      files: "src/invoices/export.ts",
      approach: "Plan, implement, review, PR.",
      outOfScope: "CI watch.",
      testPlan: "Archive removes the worktree.",
    }),
    url: "https://github.com/acme/web/issues/44",
    repoSlug: "acme/web",
  });
}

function sortCsv(): Issue {
  return issue({
    id: "github:acme/web#50",
    source: "github",
    key: "acme/web#50",
    title: "Sort CSV columns",
    body: shaped("Sort CSV columns", {
      goal: "A second success path on acme/web for queue tests.",
      acceptance: "- Columns are sorted stably.",
      files: "src/invoices/export.ts",
      approach: "Sort headers then rows.",
      outOfScope: "Custom column order UI.",
      testPlan: "Start after another agent is busy.",
    }),
    url: "https://github.com/acme/web/issues/50",
    repoSlug: "acme/web",
  });
}
