export type SyncState = {
  label: string;
  tone: "success" | "warning" | "default";
  detail: string;
};

export function syncFromIssues(iss: {
  offline: boolean;
  errors: string[];
  offlineSources?: { jira: boolean; github: boolean };
}): SyncState {
  const sources = iss.offlineSources ?? { jira: false, github: false };
  const jira = sources.jira ? "unavailable" : "ok";
  const github = sources.github ? "unavailable" : "ok";
  const detail = `Jira: ${jira} · GitHub: ${github}${iss.errors.length ? ` · ${iss.errors.join("; ")}` : ""}`;
  if (iss.offline) return { label: "Offline", tone: "warning", detail };
  if (sources.jira || sources.github || iss.errors.length) {
    return { label: "Partial", tone: "warning", detail };
  }
  return { label: "Synced", tone: "success", detail };
}
