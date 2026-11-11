import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Box, FormControl, Heading, Text, TextInput } from "@primer/react";
import type { Repo, Settings, ThemeMode } from "@flightdeck/shared";
import { api } from "../api/index.ts";
import { useThemeMode } from "../theme/index.ts";
import { AgentSettings } from "./AgentSettings.tsx";
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

  if (!settings) return <Box sx={{ p: 4 }}>{error ?? "Loading…"}</Box>;

  return (
    <Box sx={{ p: [3, 4], maxWidth: 720 }}>
      <Heading as="h2">Settings</Heading>
      {error ? <Text sx={{ color: "danger.fg" }}>{error}</Text> : null}
      <Section title="Theme">
        <FormControl>
          <FormControl.Label>Color mode</FormControl.Label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ThemeMode)}
            style={{ padding: 6 }}
          >
            <option value="system">System (macOS)</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </FormControl>
      </Section>
      <JiraSettings settings={settings} onSave={save} setError={setError} />
      <Section title="Label prefix">
        <FormControl>
          <FormControl.Label>Jira repo label prefix</FormControl.Label>
          <TextInput
            value={settings.labelPrefix}
            onChange={(e) => void save({ labelPrefix: e.target.value || "gh:" })}
          />
          <FormControl.Caption>Issues tagged like {settings.labelPrefix}owner/repo map to that GitHub repo.</FormControl.Caption>
        </FormControl>
      </Section>
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box sx={{ mt: 4 }}>
      <Heading as="h3" sx={{ fontSize: 2, mb: 3 }}>
        {title}
      </Heading>
      {children}
    </Box>
  );
}
