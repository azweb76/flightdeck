import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import type { Repo } from "@flightdeck/shared";
import { api, subscribeEvents } from "./features/api/index.ts";
import { IssueDetailPage, IssuesPage } from "./features/issues/index.ts";
import { PlaceholderPage } from "./features/placeholders/index.ts";
import { SettingsPage } from "./features/settings/index.ts";
import { AppShell } from "./features/shell/index.ts";
import { ThemeRoot, useThemeMode } from "./features/theme/index.ts";
import { SetupWizard } from "./features/wizard/index.ts";

export function App() {
  const { mode } = useThemeMode();
  const [ready, setReady] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [repos, setRepos] = useState<Repo[]>([]);

  const refresh = useCallback(async () => {
    const [setup, repoRes] = await Promise.all([api.setup(), api.repos()]);
    setSetupComplete(setup.complete);
    setRepos(repoRes.repos);
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh().catch(() => setReady(true));
    return subscribeEvents(() => {
      void refresh();
    });
  }, [refresh]);

  if (!ready) return <ThemeRoot mode={mode}>Loading…</ThemeRoot>;

  return (
    <ThemeRoot mode={mode}>
      <Routes>
        <Route
          path="/setup"
          element={
            setupComplete ? <Navigate to="/issues" replace /> : <SetupWizard onDone={() => void refresh()} />
          }
        />
        <Route element={setupComplete ? <AppShell repos={repos} /> : <Navigate to="/setup" replace />}>
          <Route path="/" element={<Navigate to="/issues" replace />} />
          <Route path="/issues" element={<IssuesPage />} />
          <Route path="/issues/:id" element={<IssueDetailPage />} />
          <Route path="/runs" element={<PlaceholderPage title="Runs" />} />
          <Route path="/reviews" element={<PlaceholderPage title="Reviews" />} />
          <Route path="/stats" element={<PlaceholderPage title="Stats" />} />
          <Route
            path="/settings"
            element={<SettingsPage repos={repos} onReposChange={() => void refresh()} />}
          />
        </Route>
      </Routes>
    </ThemeRoot>
  );
}
