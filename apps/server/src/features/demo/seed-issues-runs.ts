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

export function extraRunIssues(): Issue[] {
  return [occupyingReview(), capApi(), doneWeb(), sortCsv(), ciAsk(), ciFix()];
}

function occupyingReview(): Issue {
  return issue({
    id: "github:acme/web#45",
    source: "github",
    key: "acme/web#45",
    title: "Reviewing a third web checkout",
    body: shaped("Reviewing a third web checkout", {
      goal: "Hold a concurrent slot so a queued run stays queued after pump.",
      acceptance: "- Occupies a slot while reviewing.",
      files: "apps/server/src/features/run/queue.ts",
      approach: "Stay in review until archived or resumed.",
      outOfScope: "Opening a PR from this seed.",
      testPlan: "Runs list shows Review; queue survives startup pump.",
    }),
    url: "https://github.com/acme/web/issues/45",
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

function ciAsk(): Issue {
  return issue({
    id: "github:acme/web#70",
    source: "github",
    key: "acme/web#70",
    title: "CI keep failing after three auto-fixes",
    body: shaped("CI keep failing after three auto-fixes", {
      goal: "Watch CI and stop after three failed auto-fixes so Dan can decide.",
      acceptance: "- Three CI attempts then ask.\n- Timeline shows each round.",
      files: "apps/server/src/features/run/ci.ts",
      approach: "Watch checks, patch, push, then ask.",
      outOfScope: "Opening extra PRs.",
      testPlan: "Start this issue in demo and wait for the ask.",
    }),
    url: "https://github.com/acme/web/issues/70",
    repoSlug: "acme/web",
  });
}

function ciFix(): Issue {
  return issue({
    id: "github:acme/web#71",
    source: "github",
    key: "acme/web#71",
    title: "CI auto-fix lint on the invoices page",
    body: shaped("CI auto-fix lint on the invoices page", {
      goal: "Fail once, then pass on the second CI attempt.",
      acceptance: "- Attempt 1 fails.\n- Attempt 2 passes.",
      files: "apps/server/src/features/run/ci.ts",
      approach: "Patch the failing check in the same worktree.",
      outOfScope: "A third attempt.",
      testPlan: "Start this issue in demo and watch the timeline.",
    }),
    url: "https://github.com/acme/web/issues/71",
    repoSlug: "acme/web",
  });
}
