import type { Issue } from "@flightdeck/shared";
import { listGoals } from "../goals/store.ts";
import { listQuestions } from "../questions/store.ts";
import { runsForIssue } from "./store.ts";

export function overlayIssue(issue: Issue): Issue {
  const runs = runsForIssue(issue.id);
  const latest = runs[0];
  const goals = listGoals(issue.id);
  const approved = goals.find((g) => g.status === "approved" || g.status === "written_back");
  const openQ = latest ? listQuestions(latest.id).find((q) => q.status === "open") : undefined;
  let stage = issue.stage;
  const liveRun = latest && ["queued", "running", "paused", "asking"].includes(latest.status) && !latest.prUrl;
  if (liveRun) stage = "running";
  else if ((issue.prs?.length ?? 0) > 0 || latest?.prUrl) stage = "pr_open";
  else if (approved) stage = "refined";
  return {
    ...issue,
    stage,
    needsYou: Boolean(openQ) || latest?.status === "paused",
    statusNote: openQ?.prompt ?? latest?.pauseReason,
    latestRunId: latest?.id,
  };
}
