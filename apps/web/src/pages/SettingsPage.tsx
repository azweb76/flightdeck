import { Alert, Box, Button, MenuItem, Paper, Select, Stack, TextField, Typography } from "@mui/material";
import type { CatalogRepo, Settings } from "@flightdeck/shared";
import { useColorScheme } from "@mui/material/styles";
import { useEffect, useState } from "react";
import { api } from "../api.ts";
import { FormField } from "../ui/FormField.tsx";

type Status = Awaited<ReturnType<typeof api.status>>;

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings>();
  const [status, setStatus] = useState<Status>();
  const [repos, setRepos] = useState<CatalogRepo[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const { setMode } = useColorScheme();

  useEffect(() => {
    Promise.all([api.settings(), api.status(), api.repos()])
      .then(([s, st, r]) => {
        setSettings(s);
        setStatus(st);
        setRepos(r.repos);
        if (s.theme !== "system") setMode(s.theme);
      })
      .catch((e: Error) => setError(e.message));
  }, [setMode]);

  if (!settings || !status) {
    return error ? <Alert severity="error">{error}</Alert> : <Typography color="text.secondary">Loading…</Typography>;
  }

  return (
    <Stack spacing={4}>
      <Typography variant="h4">Settings</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {ok ? <Alert severity="success">{ok}</Alert> : null}
      <StatusCards status={status} repos={repos} />
      <CapsForm
        settings={settings}
        onChange={async (patch) => {
          const next = await api.patchSettings(patch);
          setSettings(next);
          if (patch.theme) setMode(patch.theme === "system" ? "system" : patch.theme);
          setOk("Settings saved");
        }}
      />
      <JiraForm
        settings={settings}
        onError={setError}
        onOk={(msg, next) => {
          setOk(msg);
          setSettings(next);
          setError("");
        }}
      />
    </Stack>
  );
}

function StatusCards(props: { status: Status; repos: CatalogRepo[] }) {
  const { claude, github, jira } = props.status;
  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
      }}
    >
      <Paper sx={{ p: 3, border: 1, borderColor: "divider" }} data-testid="claude-status">
        <Typography variant="overline" color="text.secondary">
          Claude
        </Typography>
        <Typography variant="h6">{claude.found ? "Ready" : "Needs login"}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {claude.detail}
        </Typography>
      </Paper>
      <Paper sx={{ p: 3, flex: 1, border: 1, borderColor: "divider" }} data-testid="github-status">
        <Typography variant="overline" color="text.secondary">
          GitHub
        </Typography>
        <Typography variant="h6">{github.loggedIn ? github.user ?? "Logged in" : "Not logged in"}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {github.detail}. On a Mac, run gh auth login.
        </Typography>
      </Paper>
      <Paper sx={{ p: 3, flex: 1, border: 1, borderColor: "divider" }} data-testid="jira-status">
        <Typography variant="overline" color="text.secondary">
          Jira
        </Typography>
        <Typography variant="h6">{jira.configured ? "Connected" : "Not connected"}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {jira.detail}
        </Typography>
      </Paper>
      <Paper sx={{ p: 3, flex: 1, border: 1, borderColor: "divider" }} data-testid="repos-list">
        <Typography variant="overline" color="text.secondary">
          Repos
        </Typography>
        {props.repos.length === 0 ? (
          <Typography color="text.secondary">No repos yet. Clone one when you start shaping.</Typography>
        ) : (
          props.repos.map((r) => (
            <Typography key={`${r.owner}/${r.name}`} sx={{ mt: 1 }}>
              {r.owner}/{r.name}
            </Typography>
          ))
        )}
      </Paper>
    </Box>
  );
}

function CapsForm(props: { settings: Settings; onChange: (p: Partial<Settings>) => Promise<void> }) {
  const s = props.settings;
  return (
    <Paper sx={{ p: 4, border: 1, borderColor: "divider" }}>
      <Typography variant="h6" sx={{ mb: 3 }}>
        Spend and concurrency
      </Typography>
      <FormField label="Per-run dollar cap (USD)">
        <TextField
          type="number"
          value={s.dollarCapUsd}
          onChange={(e) => void props.onChange({ dollarCapUsd: Number(e.target.value) })}
          inputProps={{ "data-testid": "cap-run" }}
        />
      </FormField>
      <FormField label="Daily dollar cap (USD)">
        <TextField
          type="number"
          value={s.dailyDollarCapUsd}
          onChange={(e) => void props.onChange({ dailyDollarCapUsd: Number(e.target.value) })}
          inputProps={{ "data-testid": "cap-daily" }}
        />
      </FormField>
      <FormField label="Max concurrent agents">
        <TextField
          type="number"
          value={s.maxConcurrentAgents}
          onChange={(e) => void props.onChange({ maxConcurrentAgents: Number(e.target.value) })}
          inputProps={{ "data-testid": "cap-concurrent" }}
        />
      </FormField>
      <FormField label="Appearance">
        <Select
          value={s.theme}
          onChange={(e) => void props.onChange({ theme: e.target.value as Settings["theme"] })}
          data-testid="theme-select"
        >
          <MenuItem value="system">System</MenuItem>
          <MenuItem value="light">Light</MenuItem>
          <MenuItem value="dark">Dark</MenuItem>
        </Select>
      </FormField>
    </Paper>
  );
}

function JiraForm(props: {
  settings: Settings;
  onError: (msg: string) => void;
  onOk: (msg: string, settings: Settings) => void;
}) {
  const [siteUrl, setSiteUrl] = useState(props.settings.jiraSiteUrl);
  const [email, setEmail] = useState(props.settings.jiraEmail);
  const [token, setToken] = useState("");
  const [projectKey, setProjectKey] = useState(props.settings.jiraProjectKey);

  async function connect() {
    try {
      const res = await api.connectJira({ siteUrl, email, token, projectKey });
      props.onOk(res.detail, res.settings);
    } catch (e) {
      props.onError(e instanceof Error ? e.message : "Jira connect failed");
    }
  }

  return (
    <Paper sx={{ p: 4, border: 1, borderColor: "divider" }}>
      <Typography variant="h6" sx={{ mb: 3 }}>
        Jira Cloud
      </Typography>
      <FormField label="Site URL">
        <TextField value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} inputProps={{ "data-testid": "jira-url" }} />
      </FormField>
      <FormField label="Email">
        <TextField value={email} onChange={(e) => setEmail(e.target.value)} inputProps={{ "data-testid": "jira-email" }} />
      </FormField>
      <FormField label="API token" hint="Stored in the Mac keychain when you run locally.">
        <TextField
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          inputProps={{ "data-testid": "jira-token" }}
        />
      </FormField>
      <FormField label="Default project key">
        <TextField value={projectKey} onChange={(e) => setProjectKey(e.target.value)} inputProps={{ "data-testid": "jira-key" }} />
      </FormField>
      <Button variant="contained" onClick={connect} data-testid="jira-connect">
        Connect Jira
      </Button>
    </Paper>
  );
}
