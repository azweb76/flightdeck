import type { Issue } from "@flightdeck/shared";

export function issueWarningText(issue: Issue): string | undefined {
  if (issue.source !== "jira" || issue.repoWarning === "none") return undefined;
  return issue.repoWarning === "missing" ? "No repo label" : "Multiple repo labels";
}
