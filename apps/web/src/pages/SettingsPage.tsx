import { Alert, Stack, Typography } from "@mui/material";
import type { CatalogRepo, Settings } from "@flightdeck/shared";
import { useColorScheme } from "@mui/material/styles";
import { useCallback, useEffect, useState } from "react";
import { api, type AppStatus } from "../api.ts";
import { overlayStatus, PreflightSection, usePreflight } from "../preflight/index.ts";
import { CapsForm } from "./CapsForm.tsx";
import { GithubForm } from "./GithubForm.tsx";
import { JiraForm } from "./JiraForm.tsx";
import { StatusCards } from "./StatusCards.tsx";

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings>();
  const [status, setStatus] = useState<AppStatus>();
  const [repos, setRepos] = useState<CatalogRepo[]>([]);
  const [error, setError] = useState("");
  const { setMode } = useColorScheme();
  const { report } = usePreflight();
  const shown = status ? overlayStatus(status, report) : undefined;

  const reload = useCallback(async () => {
    const [s, st, r] = await Promise.all([api.settings(), api.status(), api.repos()]);
    setSettings(s);
    setStatus(st);
    setRepos(r.repos);
    if (s.theme !== "system") setMode(s.theme);
  }, [setMode]);

  useEffect(() => {
    reload().catch((e: Error) => setError(e.message));
  }, [reload]);

  if (!settings || !status || !shown) {
    return error ? (
      <Alert severity="error" data-testid="page-error">
        {error}
      </Alert>
    ) : (
      <Typography color="text.secondary">Loading…</Typography>
    );
  }

  return (
    <Stack spacing={4}>
      <Typography variant="h4">Settings</Typography>
      {error ? (
        <Alert severity="error" data-testid="page-error">
          {error}
        </Alert>
      ) : null}
      <PreflightSection />
      <StatusCards
        status={shown}
        repos={repos}
        onClaudeHint={() => void api.claudeLogin().then((r) => setError(r.detail))}
      />
      <GithubForm
        status={shown.github}
        onDone={() => reload()}
      />
      <CapsForm
        settings={settings}
        onSaved={async (patch) => {
          const next = await api.patchSettings(patch);
          setSettings(next);
          if (patch.theme) setMode(patch.theme === "system" ? "system" : patch.theme);
        }}
      />
      <JiraForm
        settings={settings}
        hasToken={shown.jira.hasToken}
        onDone={async (next) => {
          setSettings(next);
          setError("");
          await reload();
        }}
        onFail={reload}
      />
    </Stack>
  );
}
