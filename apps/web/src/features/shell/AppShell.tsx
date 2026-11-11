import { Box, CircularProgress } from "@mui/material";
import type { CatalogRepo } from "@flightdeck/shared";
import { Suspense, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { api, subscribeEvents } from "../api/index.ts";
import { Palette } from "../palette/index.ts";
import { SideNav } from "./SideNav.tsx";
import { TopBar, type SyncState } from "./TopBar.tsx";
import { syncFromIssues } from "./syncStatus.ts";

const INITIAL: SyncState = { label: "Synced", tone: "success", detail: "Jira: ok · GitHub: ok" };

export function AppShell({ repos }: { repos: CatalogRepo[] }) {
  const [counts, setCounts] = useState({ issues: 0, runs: 0, reviews: 0, prs: 0 });
  const [asking, setAsking] = useState<{ prompt: string; href: string }>();
  const [sync, setSync] = useState<SyncState>(INITIAL);
  const [spend, setSpend] = useState<{ todayUsd: number; capUsd: number; blocked?: boolean }>();

  useEffect(() => {
    function load() {
      void api
        .issues({})
        .then((iss) => {
          setCounts((c) => ({ ...c, issues: iss.issues.length }));
          setSync(syncFromIssues(iss));
        })
        .catch(() => undefined);
      void api.prs().then((r) => setCounts((c) => ({ ...c, prs: r.badge }))).catch(() => undefined);
      void api.runs().then((r) => {
        setCounts((c) => ({ ...c, runs: r.runs.length }));
        if (r.spend) setSpend(r.spend);
      }).catch(() => undefined);
      void api.reviews().then((r) => setCounts((c) => ({ ...c, reviews: r.reviews.length }))).catch(() => undefined);
      void api.notifications().then((n) => {
        const q = n.questions[0];
        setAsking(q ? { prompt: q.prompt, href: `/runs/${q.runId}` } : undefined);
      }).catch(() => undefined);
    }
    load();
    const tick = window.setInterval(load, 15_000);
    const off = subscribeEvents((type) => {
      if (
        !type ||
        type === "issues.updated" ||
        type === "runs.updated" ||
        type === "reviews.updated" ||
        type === "questions.updated" ||
        type === "notifications.updated"
      ) {
        load();
      }
    });
    return () => {
      window.clearInterval(tick);
      off();
    };
  }, []);

  return (
    <Box sx={{ display: "flex", height: "100%", bgcolor: "background.default" }}>
      <SideNav repos={repos} counts={counts} asking={asking} />
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100%" }}>
        <TopBar sync={sync} spend={spend} />
        <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <Suspense fallback={<CircularProgress size={20} sx={{ m: 4 }} />}>
            <Outlet />
          </Suspense>
        </Box>
      </Box>
      <Palette />
    </Box>
  );
}
