import { useEffect, useState } from "react";
import type { Issue, PrSyncDiag } from "@flightdeck/shared";
import { api, subscribeEvents } from "../api/index.ts";

export type SourceOffline = { jira: boolean; github: boolean };

export function useAssignedIssues(source: string, repo?: string) {
  const [issues, setIssues] = useState<Issue[] | undefined>();
  const [errors, setErrors] = useState<string[]>([]);
  const [offline, setOffline] = useState(false);
  const [offlineSources, setOfflineSources] = useState<SourceOffline>({ jira: false, github: false });
  const [prSync, setPrSync] = useState<PrSyncDiag>();

  function load(refresh = false) {
    void api
      .issues({ source, repo, refresh: refresh ? "1" : undefined })
      .then((r) => {
        setIssues(r.issues);
        setErrors(r.errors);
        setOffline(r.offline);
        setOfflineSources(r.offlineSources ?? { jira: false, github: false });
        setPrSync(r.prSync);
      })
      .catch((err: unknown) => {
        setErrors([err instanceof Error ? err.message : "Failed to load issues"]);
        setOffline(true);
        setOfflineSources({ jira: true, github: true });
      });
  }

  useEffect(() => {
    load();
    const tick = window.setInterval(() => load(), 5 * 60_000);
    function onFocus() {
      if (document.visibilityState === "visible") load();
    }
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    const off = subscribeEvents((type) => {
      if (!type || type === "issues.updated" || type === "runs.updated") load();
    });
    return () => {
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
      off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, repo]);

  return { issues, errors, offline, offlineSources, prSync, load };
}
