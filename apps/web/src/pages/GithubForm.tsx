import { Alert, Box, Button, Link, Paper, Stack, TextField, Typography } from "@mui/material";
import { GITHUB_PAT_URL, type GithubStatus } from "@flightdeck/shared";
import { useState } from "react";
import { api } from "../api.ts";
import { FormField } from "../ui/FormField.tsx";

export function GithubForm(props: { status: GithubStatus; onDone: () => Promise<void> }) {
  const [token, setToken] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const connected = props.status.loggedIn;

  async function save() {
    setErr("");
    setOk("");
    setBusy(true);
    try {
      const res = await api.saveGithubToken(token);
      setOk(res.status.detail);
      setToken("");
      await props.onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "GitHub token was rejected");
      await props.onDone();
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setErr("");
    setOk("");
    await api.disconnectGithub();
    await props.onDone();
  }

  return (
    <Paper sx={{ p: 4, border: 1, borderColor: "divider" }} data-testid="github-form">
      <Typography variant="h6" sx={{ mb: 1 }}>
        GitHub
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Paste a classic{" "}
        <Link href={GITHUB_PAT_URL} target="_blank" rel="noreferrer" data-testid="github-pat-link">
          personal access token
        </Link>{" "}
        with repo, read:org, and workflow. Fine-grained tokens work if they grant Contents, Issues, Metadata, Pull
        requests, and Workflows. Stored in the Mac keychain (or ~/.flightdeck/secrets if keychain is unavailable).
      </Typography>
      {err ? (
        <Alert
          severity="error"
          sx={{ mb: 2, bgcolor: "error.main", color: "#fff", "& .MuiAlert-icon": { color: "#fff" } }}
          data-testid="github-form-error"
        >
          {err}
        </Alert>
      ) : null}
      {ok ? (
        <Alert severity="success" sx={{ mb: 2 }} data-testid="github-form-success">
          {ok}
        </Alert>
      ) : null}
      <Box sx={{ maxWidth: 480 }}>
        <FormField label="Personal access token" hint={connected ? "Leave blank unless you are replacing the stored token." : "Never stored in the database."}>
          <TextField
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={connected ? "Stored token" : ""}
            inputProps={{ "data-testid": "github-token" }}
          />
        </FormField>
      </Box>
      <Stack direction="row" gap={1}>
        <Button variant="contained" disabled={busy || !token.trim()} onClick={() => void save()} data-testid="github-save">
          Save token
        </Button>
        {props.status.hasToken || connected ? (
          <Button onClick={() => void disconnect()} data-testid="github-disconnect">
            Disconnect
          </Button>
        ) : null}
      </Stack>
    </Paper>
  );
}
