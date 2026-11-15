import { Route, Routes } from "react-router-dom";
import { AppShell } from "./layout/AppShell.tsx";
import { ChangePage } from "./pages/ChangePage.tsx";
import { IssuesPage } from "./pages/IssuesPage.tsx";
import { PlaceholderPage } from "./pages/PlaceholderPage.tsx";
import { RunsPage } from "./pages/RunsPage.tsx";
import { SettingsPage } from "./pages/SettingsPage.tsx";
import { ShapePage } from "./pages/ShapePage.tsx";
import { PreflightProvider } from "./preflight/index.ts";

export function App() {
  return (
    <PreflightProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<IssuesPage />} />
          <Route path="/issues" element={<IssuesPage />} />
          <Route path="/runs" element={<RunsPage />} />
          <Route path="/runs/:id" element={<ChangePage />} />
          <Route
            path="/prs"
            element={
              <PlaceholderPage
                title="My PRs"
                phase="Phase 4"
                detail="Draft PRs, CI watch, and auto-fix land in Phase 4."
              />
            }
          />
          <Route
            path="/reviews"
            element={
              <PlaceholderPage
                title="Reviews"
                phase="Phase 5"
                detail="Reviewing someone else's PR lands in Phase 5."
              />
            }
          />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/refine/:id" element={<ShapePage />} />
          <Route path="/shape/:id" element={<ShapePage />} />
        </Route>
      </Routes>
    </PreflightProvider>
  );
}
