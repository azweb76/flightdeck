import { Alert, Box, Button, Link, MenuItem, Paper, Select, Stack, TextField, Typography } from "@mui/material";
import { JIRA_API_TOKEN_URL, type CatalogRepo, type Settings } from "@flightdeck/shared";
import { useColorScheme } from "@mui/material/styles";
import { useCallback, useEffect, useState } from "react";
import { api, type AppStatus } from "../api.ts";
import { FormField } from "../ui/FormField.tsx";

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings>();
  const [status, setStatus] = useState<AppStatus>();
  const [repos, setRepos] = useState<CatalogRepo[]>([]);
  const [error, setError] = useState("");
  const { setMode } = useColorScheme();

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

  if (!settings || !status) {
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
      <StatusCards
        status={status}
        repos={repos}
        onClaudeHint={() => void api.claudeLogin().then((r) => setError(r.detail))}
        onClaudeRecheck={() => void api.recheckClaude().then(() => reload()).catch((e: Error) => setError(e.message))}
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
        hasToken={status.jira.hasToken}
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

function StatusCards(props: {
  status: AppStatus;
  repos: CatalogRepo[];
  onClaudeHint: () => void;
  onClaudeRecheck: () => void;
}) {
  const { claude, github, jira } = props.status;
  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
      <Paper sx={{ p: 3, border: 1, borderColor: "divider" }} data-testid="claude-status">
        <Typography variant="overline" color="text.secondary">
          Claude
        </Typography>
        <Typography variant="h6">{claude.found ? "Ready" : "Needs login"}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1, whiteSpace: "pre-wrap" }}>
          {claude.detail}
        </Typography>
        <Stack direction="row" gap={1} sx={{ mt: 2 }}>
          <Button variant="outlined" onClick={props.onClaudeRecheck} data-testid="claude-recheck">
            Re-check
          </Button>
          {!claude.found ? (
            <Button variant="outlined" onClick={props.onClaudeHint} data-testid="claude-login">
              How to log in
            </Button>
          ) : null}
        </Stack>
      </Paper>
      <Paper sx={{ p: 3, border: 1, borderColor: "divider" }} data-testid="github-status">
        <Typography variant="overline" color="text.secondary">
          GitHub
        </Typography>
        <Typography variant="h6">{github.loggedIn ? github.user ?? "Logged in" : "Not logged in"}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {github.loggedIn ? github.detail : `${github.detail} In a terminal run: gh auth login`}
        </Typography>
      </Paper>
      <Paper sx={{ p: 3, border: 1, borderColor: "divider" }} data-testid="jira-status">
        <Typography variant="overline" color="text.secondary">
          Jira
        </Typography>
        <Typography variant="h6">{jira.configured ? "Connected" : "Not connected"}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {jira.detail}
        </Typography>
      </Paper>
      <Paper sx={{ p: 3, border: 1, borderColor: "divider" }} data-testid="repos-list">
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

function CapsForm(props: { settings: Settings; onSaved: (p: Partial<Settings>) => Promise<void> }) {
  const [run, setRun] = useState(String(props.settings.dollarCapUsd));
  const [daily, setDaily] = useState(String(props.settings.dailyDollarCapUsd));
  const [max, setMax] = useState(String(props.settings.maxConcurrentAgents));
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  function editCap(setValue: (v: string) => void, raw: string) {
    setValue(raw);
    setErr("");
    setOk("");
  }

  async function saveNum(key: "dollarCapUsd" | "dailyDollarCapUsd" | "maxConcurrentAgents", raw: string) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) {
      setErr("Enter a number greater than 0");
      setOk("");
      return;
    }
    setErr("");
    await props.onSaved({ [key]: n });
    setOk("Caps saved");
  }

  return (
    <Paper sx={{ p: 4, border: 1, borderColor: "divider" }}>
      <Typography variant="h6" sx={{ mb: 3 }}>
        Spend and concurrency
      </Typography>
      {err ? (
        <Alert severity="error" sx={{ mb: 2 }} data-testid="cap-error">
          {err}
        </Alert>
      ) : null}
      {ok ? (
        <Alert severity="success" sx={{ mb: 2 }} data-testid="cap-saved">
          {ok}
        </Alert>
      ) : null}
      <Stack direction={{ xs: "column", sm: "row" }} gap={2} sx={{ mb: 2 }}>
        <CapField label="Per-run cap (USD)" value={run} testId="cap-run" onChange={(v) => editCap(setRun, v)} onBlur={() => void saveNum("dollarCapUsd", run)} />
        <CapField label="Daily cap (USD)" value={daily} testId="cap-daily" onChange={(v) => editCap(setDaily, v)} onBlur={() => void saveNum("dailyDollarCapUsd", daily)} />
        <CapField label="Max concurrent" value={max} testId="cap-concurrent" onChange={(v) => editCap(setMax, v)} onBlur={() => void saveNum("maxConcurrentAgents", max)} />
      </Stack>
      <Box sx={{ maxWidth: 280 }}>
        <FormField label="Appearance">
          <Select value={props.settings.theme} onChange={(e) => void props.onSaved({ theme: e.target.value as Settings["theme"] })} data-testid="theme-select">
            <MenuItem value="system">System</MenuItem>
            <MenuItem value="light">Light</MenuItem>
            <MenuItem value="dark">Dark</MenuItem>
          </Select>
        </FormField>
      </Box>
    </Paper>
  );
}

function CapField(props: {
  label: string;
  value: string;
  testId: string;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  return (
    <Box sx={{ width: { sm: 180 } }}>
      <FormField label={props.label}>
        <TextField
          type="number"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          onBlur={props.onBlur}
          inputProps={{ "data-testid": props.testId }}
        />
      </FormField>
    </Box>
  );
}

function JiraForm(props: {
  settings: Settings;
  hasToken: boolean;
  onDone: (settings: Settings) => Promise<void>;
  onFail: () => Promise<void>;
}) {
  const [siteUrl, setSiteUrl] = useState(props.settings.jiraSiteUrl);
  const [email, setEmail] = useState(props.settings.jiraEmail);
  const [token, setToken] = useState("");
  const [projectKey, setProjectKey] = useState(props.settings.jiraProjectKey);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function connect() {
    setErr("");
    setOk("");
    try {
      const res = await api.connectJira({ siteUrl, email, token, projectKey });
      setOk(res.detail);
      await props.onDone(res.settings);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Jira connect failed");
      await props.onFail();
    }
  }

  return (
    <Paper sx={{ p: 4, border: 1, borderColor: "divider" }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Jira Cloud
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Create a token at{" "}
        <Link href={JIRA_API_TOKEN_URL} target="_blank" rel="noreferrer">
          Atlassian API tokens
        </Link>
        .
      </Typography>
      {err ? (
        <Alert severity="error" sx={{ mb: 2 }} data-testid="jira-form-error">
          {err}
        </Alert>
      ) : null}
      {ok ? (
        <Alert severity="success" sx={{ mb: 2 }} data-testid="jira-form-success">
          {ok}
        </Alert>
      ) : null}
      <Box sx={{ maxWidth: 480 }}>
        <FormField label="Site URL">
          <TextField value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} inputProps={{ "data-testid": "jira-url" }} />
        </FormField>
        <FormField label="Email">
          <TextField value={email} onChange={(e) => setEmail(e.target.value)} inputProps={{ "data-testid": "jira-email" }} />
        </FormField>
        <FormField label="API token" hint={props.hasToken ? "Leave blank to keep the stored token." : "Stored in the Mac keychain when you run locally."}>
          <TextField
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={props.hasToken ? "Stored token" : ""}
            inputProps={{ "data-testid": "jira-token" }}
          />
        </FormField>
        <FormField label="Default project key">
          <TextField value={projectKey} onChange={(e) => setProjectKey(e.target.value)} inputProps={{ "data-testid": "jira-key" }} />
        </FormField>
      </Box>
      <Button variant="contained" onClick={() => void connect()} data-testid="jira-connect">
        Connect Jira
      </Button>
    </Paper>
  );
}
