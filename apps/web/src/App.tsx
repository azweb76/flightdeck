import { Route, Routes } from "react-router-dom";
import { AppShell } from "./layout/AppShell.tsx";
import { IssuesPage } from "./pages/IssuesPage.tsx";
import { PlaceholderPage } from "./pages/PlaceholderPage.tsx";
import { SettingsPage } from "./pages/SettingsPage.tsx";
import { ShapePage } from "./pages/ShapePage.tsx";

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<IssuesPage />} />
        <Route path="/issues" element={<IssuesPage />} />
        <Route path="/runs" element={<PlaceholderPage title="Runs" phase="Phase 3" />} />
        <Route path="/prs" element={<PlaceholderPage title="My PRs" phase="Phase 4" />} />
        <Route path="/reviews" element={<PlaceholderPage title="Reviews" phase="Phase 5" />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/shape/:id" element={<ShapePage />} />
      </Route>
    </Routes>
  );
}
