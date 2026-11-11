import { CircularProgress } from "@mui/material";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import type { Repo, Settings } from "@flightdeck/shared";
import { api, subscribeEvents } from "./features/api/index.ts";
import { AppShell } from "./features/shell/index.ts";
import { ThemeRoot, useThemeMode } from "./features/theme/index.ts";

const IssuesPage = lazy(() =>
  import("./features/issues/IssuesPage.tsx").then((m) => ({ default: m.IssuesPage })),
);
const IssueDetailPage = lazy(() =>
  import("./features/issues/IssueDetailPage.tsx").then((m) => ({ default: m.IssueDetailPage })),
);
const NewIssuePage = lazy(() =>
  import("./features/issues/NewIssuePage.tsx").then((m) => ({ default: m.NewIssuePage })),
);
const ReviewsPage = lazy(() =>
  import("./features/reviews/ReviewsPage.tsx").then((m) => ({ default: m.ReviewsPage })),
);
const ReviewDiff = lazy(() =>
  import("./features/reviews/ReviewDiff.tsx").then((m) => ({ default: m.ReviewDiff })),
);
const RunView = lazy(() => import("./features/runs/RunView.tsx").then((m) => ({ default: m.RunView })));
const RunsPage = lazy(() => import("./features/runs/RunsPage.tsx").then((m) => ({ default: m.RunsPage })));
const SettingsPage = lazy(() =>
  import("./features/settings/SettingsPage.tsx").then((m) => ({ default: m.SettingsPage })),
);
const StatsPage = lazy(() => import("./features/stats/StatsPage.tsx").then((m) => ({ default: m.StatsPage })));
const SetupWizard = lazy(() =>
  import("./features/wizard/SetupWizard.tsx").then((m) => ({ default: m.SetupWizard })),
);

function PageFallback() {
  return <CircularProgress size={20} sx={{ m: 4 }} />;
}

export function App() {
  const { mode } = useThemeMode();
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>();
  const [repos, setRepos] = useState<Repo[]>([]);

  const refresh = useCallback(async () => {
    const [next, repoRes] = await Promise.all([api.settings(), api.repos()]);
    setSettings(next);
    setRepos(repoRes.repos);
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh().catch(() => setReady(true));
    return subscribeEvents((type) => {
      if (!type || type === "settings.updated" || type === "setup.updated" || type === "repos.updated") {
        void refresh();
      }
    });
  }, [refresh]);

  if (!ready || !settings) {
    return (
      <ThemeRoot mode={mode}>
        <PageFallback />
      </ThemeRoot>
    );
  }

  const setupComplete = settings.setupComplete;

  return (
    <ThemeRoot mode={mode}>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route
            path="/setup"
            element={setupComplete ? <Navigate to="/issues" replace /> : <SetupWizard onDone={() => void refresh()} />}
          />
          <Route element={setupComplete ? <AppShell repos={repos} /> : <Navigate to="/setup" replace />}>
            <Route path="/" element={<Navigate to="/issues" replace />} />
            <Route path="/issues" element={<IssuesPage />} />
            <Route path="/issues/new" element={<NewIssuePage />} />
            <Route path="/issues/:id" element={<IssueDetailPage />} />
            <Route path="/runs" element={<RunsPage />} />
            <Route path="/runs/:id" element={<RunView />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/reviews/:id" element={<ReviewDiff />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route
              path="/settings"
              element={<SettingsPage settings={settings} repos={repos} onReposChange={() => void refresh()} />}
            />
          </Route>
        </Routes>
      </Suspense>
    </ThemeRoot>
  );
}
