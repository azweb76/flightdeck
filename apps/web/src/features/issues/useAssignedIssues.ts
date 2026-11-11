import { useEffect, useState } from "react";
import type { Issue } from "@flightdeck/shared";
import { api } from "../api/index.ts";

export function useAssignedIssues(source: string, repo?: string) {
  const [issues, setIssues] = useState<Issue[] | undefined>();
  const [errors, setErrors] = useState<string[]>([]);
  const [offline, setOffline] = useState(false);

  function load(refresh = false) {
    void api
      .issues({ source, repo, refresh: refresh ? "1" : undefined })
      .then((r) => {
        setIssues(r.issues);
        setErrors(r.errors);
        setOffline(r.offline);
      })
      .catch((err: unknown) => {
        setErrors([err instanceof Error ? err.message : "Failed to load issues"]);
        setOffline(true);
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
    return () => {
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, repo]);

  return { issues, errors, offline, load };
}
