import type { Issue } from "@flightdeck/shared";

export function refineDisabledReason(networkOffline: boolean): string | undefined {
  if (networkOffline) return "This source is unreachable. Refine is paused until it comes back.";
  return undefined;
}

export function startDisabledReason(issue: Issue, networkOffline: boolean, pickedRepo: boolean): string | undefined {
  if (networkOffline) return "This source is unreachable. Start is paused until it comes back.";
  const hasRepo = pickedRepo || issue.repos.length === 1;
  if (!hasRepo) return "Pick a GitHub repo to start. Jira labels like gh:owner/repo also map an issue to a repo.";
  return undefined;
}

export function writeBackDisabledReason(networkOffline: boolean): string | undefined {
  if (networkOffline) return "This source is unreachable. Write-back is paused until it comes back.";
  return undefined;
}
