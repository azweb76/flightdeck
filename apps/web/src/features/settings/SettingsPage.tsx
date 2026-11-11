import { useEffect, useState } from "react";
import { Alert, Box, MenuItem, TextField, Typography } from "@mui/material";
import type { Repo, Settings, ThemeMode } from "@flightdeck/shared";
import { api } from "../api/index.ts";
import { useThemeMode } from "../theme/index.ts";
import { AgentSettings } from "./AgentSettings.tsx";
import { SettingsCard } from "./SettingsCard.tsx";
import { TeamConfigButtons } from "./TeamConfigButtons.tsx";
import { JiraSettings } from "./JiraSettings.tsx";
import { RepoSettings } from "./RepoSettings.tsx";

export function SettingsPage({
  repos,
  onReposChange,
}: {
  repos: Repo[];
  onReposChange: () => void;
}) {
  const [settings, setSettings] = useState<Settings>();
  const [error, setError] = useState<string>();
  const { mode, setMode } = useThemeMode();

  useEffect(() => {
    void api.settings().then(setSettings).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    });
  }, []);

  async function save(patch: Partial<Settings>) {
    const next = await api.saveSettings(patch);
    setSettings(next);
  }

  if (!settings) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>{error ?? "Loading settings…"}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 480, minHeight: "100%" }}>
      <Typography variant="h2" sx={{ mb: 2 }}>
        Settings
      </Typography>
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <SettingsCard title="Theme">
        <TextField
          select
          fullWidth
          label="Color mode"
          value={mode}
          onChange={(e) => setMode(e.target.value as ThemeMode)}
          helperText="System follows macOS prefers-color-scheme"
        >
          <MenuItem value="system">System (macOS)</MenuItem>
          <MenuItem value="light">Light</MenuItem>
          <MenuItem value="dark">Dark</MenuItem>
        </TextField>
      </SettingsCard>
      <JiraSettings settings={settings} onSave={save} setError={setError} />
      <SettingsCard title="Label prefix">
        <TextField
          fullWidth
          label="Jira repo label prefix"
          value={settings.labelPrefix}
          onChange={(e) => void save({ labelPrefix: e.target.value || "gh:" })}
          helperText={`Issues tagged like ${settings.labelPrefix}owner/repo map to that GitHub repo.`}
        />
      </SettingsCard>
      <TeamConfigButtons />
      <AgentSettings settings={settings} onSave={save} />
      <RepoSettings
        repos={repos}
        workspaceFolder={settings.workspaceFolder}
        onWorkspace={(workspaceFolder) => void save({ workspaceFolder })}
        onChange={onReposChange}
        setError={setError}
      />
    </Box>
  );
}
