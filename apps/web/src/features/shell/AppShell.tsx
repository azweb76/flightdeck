import { Box } from "@mui/material";
import type { Repo } from "@flightdeck/shared";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { api, subscribeEvents } from "../api/index.ts";
import { Palette } from "../palette/index.ts";
import { NeedsYouBanner } from "./NeedsYouBanner.tsx";
import { SideNav } from "./SideNav.tsx";
import { TopBar } from "./TopBar.tsx";

export function AppShell({ repos }: { repos: Repo[] }) {
  const loc = useLocation();
  const [counts, setCounts] = useState({ issues: 0, runs: 0, reviews: 0 });
  const [asking, setAsking] = useState<{ prompt: string; href: string }>();
  const [syncLabel, setSyncLabel] = useState("Synced");
  const [syncTone, setSyncTone] = useState<"success" | "warning" | "default">("success");

  useEffect(() => {
    function load() {
      void api.issues({}).then((iss) => {
        setCounts((c) => ({ ...c, issues: iss.issues.length }));
        if (iss.offline) {
          setSyncLabel("Offline");
          setSyncTone("warning");
        } else if (iss.errors.length) {
          setSyncLabel("Sync warning");
          setSyncTone("warning");
        } else {
          setSyncLabel("Synced");
          setSyncTone("success");
        }
      }).catch(() => {
        setSyncLabel("Offline");
        setSyncTone("warning");
      });
      void api.runs().then((r) => setCounts((c) => ({ ...c, runs: r.runs.length }))).catch(() => undefined);
      void api.reviews().then((r) => setCounts((c) => ({ ...c, reviews: r.reviews.length }))).catch(() => undefined);
      void api.notifications().then((n) => {
        const q = n.questions[0];
        setAsking(q ? { prompt: q.prompt, href: `/runs/${q.runId}` } : undefined);
      }).catch(() => undefined);
    }
    load();
    const tick = window.setInterval(load, 15_000);
    const off = subscribeEvents(load);
    return () => {
      window.clearInterval(tick);
      off();
    };
  }, [loc.pathname]);

  return (
    <Box sx={{ display: "flex", height: "100%", bgcolor: "background.default" }}>
      <SideNav repos={repos} counts={counts} asking={asking} />
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100%" }}>
        <TopBar syncLabel={syncLabel} syncTone={syncTone} />
        <NeedsYouBanner />
        <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <Outlet />
        </Box>
      </Box>
      <Palette />
    </Box>
  );
}
