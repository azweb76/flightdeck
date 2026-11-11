import { useEffect, useState } from "react";
import type { Issue } from "@flightdeck/shared";
import { api, subscribeEvents } from "../api/index.ts";

export function useIssue(id: string | undefined) {
  const [issue, setIssue] = useState<Issue | undefined>();
  const [error, setError] = useState<string>();
  const [offline, setOffline] = useState(false);
  const [offlineSources, setOfflineSources] = useState({ jira: false, github: false });

  function load() {
    if (!id) return;
    void api
      .issues({})
      .then((r) => {
        setOffline(r.offline);
        setOfflineSources(r.offlineSources ?? { jira: false, github: false });
      })
      .catch(() => {
        setOffline(true);
        setOfflineSources({ jira: true, github: true });
      });
    void api
      .issue(decodeURIComponent(id))
      .then((iss) => {
        setIssue(iss);
        setError(undefined);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Not found");
      });
  }

  useEffect(() => {
    load();
    return subscribeEvents(() => load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return { issue, error, offline, offlineSources, load };
}
