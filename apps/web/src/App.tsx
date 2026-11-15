import { Route, Routes } from "react-router-dom";
import { AppShell } from "./layout/AppShell.tsx";
import { ChangePage } from "./pages/ChangePage.tsx";
import { IssuesPage } from "./pages/IssuesPage.tsx";
import { MyPrsPage } from "./pages/MyPrsPage.tsx";
import { ReviewsPage } from "./pages/ReviewsPage.tsx";
import { ReviewPage } from "./pages/ReviewPage.tsx";
import { PrDetailPage } from "./pages/PrDetailPage.tsx";
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
