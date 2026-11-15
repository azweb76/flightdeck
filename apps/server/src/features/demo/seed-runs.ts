import type { Change, ChangeAsk, Issue } from "@flightdeck/shared";
import { addEvent, insertChange, listChanges, saveChange } from "../run/store.ts";
import { demoWorktree } from "../run/worktree.ts";
import { seedIssues } from "./seed-issues.ts";

export function seedDemoRuns(): void {
  if (process.env.FLIGHTDECK_DEMO !== "1") return;
  if (listChanges().length > 0) return;
  const byKey = new Map(seedIssues().map((issue) => [issue.key, issue]));
  seedInterrupted(byKey.get("acme/web#41"));
  seedAsking(byKey.get("acme/web#42"));
  seedCapHit(byKey.get("acme/api#43"));
  seedDone(byKey.get("acme/web#44"));
  seedQueued(byKey.get("acme/web#40"));
}

function seedQueued(issue: Issue | undefined): void {
  const change = base(issue, "success", "queued");
  if (!change) return;
  addEvent(change, { kind: "system", title: "queued", detail: "Waiting for a free agent slot." });
}

function seedInterrupted(issue: Issue | undefined): void {
  const change = base(issue, "success", "implementing");
  if (!change) return;
  change.stage = "implement";
  change.planText = "Keep the plan in Flightdeck. Own worktree on acme/web.";
  saveChange(change);
  addEvent(change, { kind: "stage", title: "implement", detail: "Round 1" });
  addEvent(change, { kind: "text", title: "implement", detail: "Adding the parallel checkout path." });
}

function seedAsking(issue: Issue | undefined): void {
  const change = base(issue, "ask", "asking");
  if (!change) return;
  const ask: ChangeAsk = {
    prompt: "Should the CSV include refunded invoices, or only paid ones?",
    options: [
      { id: "paid", label: "Paid only" },
      { id: "all", label: "Include refunds" },
    ],
  };
  change.ask = ask;
  change.planText = "Ask Dan which rows to include.";
  saveChange(change);
  addEvent(change, { kind: "ask", title: "Need a decision", detail: ask.prompt, ask });
}

function seedCapHit(issue: Issue | undefined): void {
  const change = base(issue, "cap", "cap_hit");
  if (!change) return;
  change.costUsd = 12;
  saveChange(change);
  addEvent(change, { kind: "usage", title: "usage", detail: "+$12.00 (run $12.00)", costUsd: 12 });
  addEvent(change, {
    kind: "system",
    title: "cap",
    detail: "This change hit the per-run dollar cap. Raise it in Settings or archive and try a smaller change.",
  });
}

function seedDone(issue: Issue | undefined): void {
  const change = base(issue, "success", "done");
  if (!change) return;
  change.stage = "ci";
  change.reviewRound = 1;
  change.costUsd = 0.65;
  change.prUrl = "https://github.com/acme/web/pull/44";
  change.prNumber = 44;
  change.planText = "CSV export shipped.";
  saveChange(change);
  addEvent(change, { kind: "system", title: "draft pr", detail: "Opened draft PR https://github.com/acme/web/pull/44" });
}

function base(issue: Issue | undefined, scenario: string, status: Change["status"]): Change | undefined {
  if (!issue?.repoSlug) return undefined;
  const [owner, name] = issue.repoSlug.split("/");
  const change = insertChange(issue, scenario, "", "", status);
  const wt = demoWorktree(change.id, `${owner}-${name}`);
  change.worktreePath = wt.path;
  change.branch = wt.branch;
  saveChange(change);
  addEvent(change, { kind: "system", title: "start", detail: `Worktree ${change.branch}` });
  return change;
}
