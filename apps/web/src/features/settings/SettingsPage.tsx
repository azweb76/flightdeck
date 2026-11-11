import { useEffect, useState } from "react";
import { Alert, Box, MenuItem, TextField, Typography } from "@mui/material";
import type { Settings, ThemeMode } from "@flightdeck/shared";
import { api } from "../api/index.ts";
import { useThemeMode } from "../theme/index.ts";
import { AgentSettings } from "./AgentSettings.tsx";
import { SettingsCard } from "./SettingsCard.tsx";
import { TeamConfigButtons } from "./TeamConfigButtons.tsx";
import { JiraSettings } from "./JiraSettings.tsx";
import { BoardSettings } from "./BoardSettings.tsx";
import { Diagnostics } from "./Diagnostics.tsx";

export function SettingsPage({ settings: initial }: { settings: Settings }) {
  const [settings, setSettings] = useState<Settings>(initial);
  const [error, setError] = useState<string>();
  const { mode, setMode } = useThemeMode();

  useEffect(() => {
    setSettings(initial);
  }, [initial]);

  async function save(patch: Partial<Settings>) {
    const next = await api.saveSettings(patch);
    setSettings(next);
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
      <BoardSettings settings={settings} onSave={save} />
      <Diagnostics />
      <TeamConfigButtons />
      <AgentSettings settings={settings} onSave={save} />
    </Box>
  );
}
