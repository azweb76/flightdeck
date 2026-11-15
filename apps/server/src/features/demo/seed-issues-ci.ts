import { draftToMarkdown, emptyDraft, type Issue, type IssueDraft } from "@flightdeck/shared";

const NOW = "2026-11-12T12:00:00.000Z";

function shaped(title: string, sections: Omit<IssueDraft, "title">): string {
  return draftToMarkdown({ ...emptyDraft(), title, ...sections });
}

export function extraCiIssues(): Issue[] {
  return [ciWaitSlot(), ciActionRequired()];
}

function ciWaitSlot(): Issue {
  return {
    id: "github:acme/web#73",
    source: "github",
    key: "acme/web#73",
    title: "CI fix waiting for a free slot",
    body: shaped("CI fix waiting for a free slot", {
      goal: "Show a CI auto-fix queued behind other agents.",
      acceptance: "- Timeline says waiting for a free slot.",
      files: "apps/server/src/features/run/ci-slot.ts",
      approach: "Park the fix on the same claim queue as Start.",
      outOfScope: "A timeout.",
      testPlan: "Open this seeded run in demo.",
    }),
    url: "https://github.com/acme/web/issues/73",
    repoSlug: "acme/web",
    updatedAt: NOW,
    saved: true,
    demo: true,
  };
}

function ciActionRequired(): Issue {
  return {
    id: "github:acme/web#72",
    source: "github",
    key: "acme/web#72",
    title: "CI needs a GitHub action",
    body: shaped("CI needs a GitHub action", {
      goal: "Ask Dan when a check needs a GitHub action.",
      acceptance: "- Banner says a GitHub check needs you.\n- Link opens the PR.",
      files: "apps/web/src/pages/ChangePage.tsx",
      approach: "Dedicated ask reason, not the gave-up copy.",
      outOfScope: "Fixing the check automatically.",
      testPlan: "Open this seeded run in demo.",
    }),
    url: "https://github.com/acme/web/issues/72",
    repoSlug: "acme/web",
    updatedAt: NOW,
    saved: true,
    demo: true,
  };
}
