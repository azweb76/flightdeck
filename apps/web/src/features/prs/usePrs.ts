import { useEffect, useState } from "react";
import type { BoardPr } from "@flightdeck/shared";
import { api, subscribeEvents } from "../api/index.ts";

export function usePrs() {
  const [prs, setPrs] = useState<BoardPr[]>();
  const [badge, setBadge] = useState(0);
  function load() {
    void api
      .prs()
      .then((r) => {
        setPrs(r.prs);
        setBadge(r.badge);
      })
      .catch(() => undefined);
  }
  useEffect(() => {
    load();
    return subscribeEvents((type) => {
      if (!type || type === "issues.updated" || type === "runs.updated") load();
    });
  }, []);
  return { prs, badge, load };
}
