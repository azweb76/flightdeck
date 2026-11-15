import { Route, Routes } from "react-router-dom";
import { AppShell } from "./layout/AppShell.tsx";
import { IssuesPage } from "./features/issues/index.ts";
import { MyPrsPage, PrDetailPage } from "./features/prs/index.ts";
import { ShapePage } from "./features/refine/index.ts";
import { ReviewPage, ReviewsPage } from "./features/reviews/index.ts";
import { ChangePage, RunsPage } from "./features/runs/index.ts";
import { SettingsPage } from "./features/settings/index.ts";
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
          <Route path="/prs" element={<MyPrsPage />} />
          <Route path="/prs/:owner/:name/:number" element={<PrDetailPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/reviews/:id" element={<ReviewPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/refine/:id" element={<ShapePage />} />
          <Route path="/shape/:id" element={<ShapePage />} />
        </Route>
      </Routes>
    </PreflightProvider>
  );
}
