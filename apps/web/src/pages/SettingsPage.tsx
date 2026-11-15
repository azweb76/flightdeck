import { Alert, Stack, Typography } from "@mui/material";
import type { SettingsView } from "@flightdeck/shared";
import { useColorScheme } from "@mui/material/styles";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api.ts";
import { CapsForm } from "./CapsForm.tsx";
import { ClaudeForm } from "./ClaudeForm.tsx";
import { GithubForm } from "./GithubForm.tsx";
import { JiraForm } from "./JiraForm.tsx";

export function SettingsPage() {
  const [settings, setSettings] = useState<SettingsView>();
  const [error, setError] = useState("");
  const { setMode } = useColorScheme();

  const reload = useCallback(async () => {
    const s = await api.settings();
    setSettings(s);
    if (s.theme !== "system") setMode(s.theme);
  }, [setMode]);

  useEffect(() => {
    reload().catch((e: Error) => setError(e.message));
  }, [reload]);

  if (!settings) {
    return error ? (
      <Alert severity="error" data-testid="page-error">
        {error}
      </Alert>
    ) : (
      <Typography color="text.secondary">Loading…</Typography>
    );
  }

  async function savePatch(patch: Partial<SettingsView>) {
    const next = await api.patchSettings(patch);
    setSettings(next);
    if (patch.theme) setMode(patch.theme === "system" ? "system" : patch.theme);
  }

  return (
    <Stack spacing={4}>
      <Typography variant="h4">Settings</Typography>
      {error ? (
        <Alert severity="error" data-testid="page-error">
          {error}
        </Alert>
      ) : null}
      <GithubForm
        tokenSource={settings.githubTokenSource}
        hasGithubToken={settings.hasGithubToken}
        onDone={(next) =>
          setSettings({ ...settings, githubTokenSource: next.tokenSource, hasGithubToken: next.hasGithubToken })
        }
      />
      <ClaudeForm settings={settings} onSaved={savePatch} />
      <JiraForm settings={settings} onDone={setSettings} />
      <CapsForm settings={settings} onSaved={savePatch} />
    </Stack>
  );
}
