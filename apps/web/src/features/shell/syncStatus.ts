export type SyncState = {
  label: string;
  tone: "success" | "warning" | "default";
  detail: string;
};

export function syncFromIssues(iss: {
  offline: boolean;
  errors: string[];
  offlineSources?: { jira: boolean; github: boolean };
  prSync?: { error?: string; total?: number };
}): SyncState {
  const sources = iss.offlineSources ?? { jira: false, github: false };
  const jira = sources.jira ? "unavailable" : "ok";
  const github = sources.github ? "unavailable" : "ok";
  const extra = [...iss.errors];
  if (iss.prSync?.error && !extra.includes(iss.prSync.error)) extra.push(iss.prSync.error);
  const detail = `Jira: ${jira} · GitHub: ${github}${extra.length ? ` · ${extra.join("; ")}` : ""}`;
  if (iss.offline) return { label: "Offline", tone: "warning", detail };
  if (sources.jira || sources.github || extra.length) {
    return { label: "Partial", tone: "warning", detail };
  }
  return { label: "Synced", tone: "success", detail };
}
