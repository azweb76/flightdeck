import { Alert, Box, Button, Link, Paper, Stack, TextField, Typography } from "@mui/material";
import { GITHUB_PAT_URL, githubTokenSourceLabel, type GithubTokenSource } from "@flightdeck/shared";
import { useState } from "react";
import { api } from "../api.ts";
import { FormField } from "../ui/FormField.tsx";

export function GithubForm(props: {
  tokenSource?: GithubTokenSource;
  hasGithubToken: boolean;
  onDone: (next: { tokenSource?: GithubTokenSource; hasGithubToken: boolean }) => void;
}) {
  const [token, setToken] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const sourceLabel = githubTokenSourceLabel(props.tokenSource);
  const envWins = props.tokenSource === "GITHUB_TOKEN" || props.tokenSource === "GH_TOKEN";

  async function save() {
    setErr("");
    setOk("");
    setBusy(true);
    try {
      const res = await api.saveGithubToken(token);
      setOk("GitHub token saved");
      setToken("");
      props.onDone(res);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save the GitHub token");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setErr("");
    setOk("");
    props.onDone(await api.disconnectGithub());
  }

  return (
    <Paper sx={{ p: 4, border: 1, borderColor: "divider" }} data-testid="github-form">
      <Typography variant="h6" sx={{ mb: 1 }}>
        GitHub
      </Typography>
      <GithubHelp envWins={envWins} sourceLabel={sourceLabel} />
      {err ? (
        <Alert severity="error" sx={{ mb: 2 }} data-testid="github-form-error">
          {err}
        </Alert>
      ) : null}
      {ok ? (
        <Alert severity="success" sx={{ mb: 2 }} data-testid="github-form-success">
          {ok}
        </Alert>
      ) : null}
      <Box sx={{ maxWidth: 480 }}>
        <FormField label="Personal access token" hint={tokenHint(envWins, props.hasGithubToken)}>
          <TextField
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={props.hasGithubToken ? "Stored token" : ""}
            inputProps={{ "data-testid": "github-token" }}
          />
        </FormField>
      </Box>
      <Stack direction="row" gap={1}>
        <Button variant="contained" disabled={busy || !token.trim()} onClick={() => void save()} data-testid="github-save">
          Save
        </Button>
        {props.hasGithubToken && !envWins ? (
          <Button onClick={() => void disconnect()} data-testid="github-disconnect">
            Clear stored token
          </Button>
        ) : null}
      </Stack>
    </Paper>
  );
}

function tokenHint(envWins: boolean, hasToken: boolean): string {
  if (envWins) return "A pasted token is stored for later; GITHUB_TOKEN / GH_TOKEN win until you unset them.";
  if (hasToken) return "Leave blank unless you are replacing the stored token.";
  return "Never stored in the database. GITHUB_TOKEN or GH_TOKEN in the environment overrides this.";
}

function GithubHelp(props: { envWins: boolean; sourceLabel: string }) {
  return (
    <Stack spacing={0.5} sx={{ mb: 2 }} data-testid="github-help">
      {props.sourceLabel ? (
        <Typography variant="body2" data-testid="github-token-source">
          {props.sourceLabel}.
        </Typography>
      ) : null}
      <Typography variant="body2" color="text.secondary">
        Paste a classic{" "}
        <Link href={GITHUB_PAT_URL} target="_blank" rel="noreferrer" data-testid="github-pat-link">
          personal access token
        </Link>{" "}
        with repo, read:org, and workflow. Saving stores it only; connectivity is checked at startup.
      </Typography>
      {props.envWins ? null : (
        <Typography variant="body2" color="text.secondary">
          Stored in the Mac keychain, or ~/.flightdeck/secrets if keychain is unavailable.
        </Typography>
      )}
    </Stack>
  );
}
