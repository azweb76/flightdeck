import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { api } from "../api/index.ts";
import { JiraTokenHint } from "../jira/index.ts";

export function JiraStep({ onConnected }: { onConnected: () => void }) {
  const [siteUrl, setSiteUrl] = useState("");
  const [email, setEmail] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [detail, setDetail] = useState<string>();
  const [error, setError] = useState<string>();

  async function connect() {
    setError(undefined);
    try {
      const r = await api.connectJira({ siteUrl, email, apiToken });
      setDetail(r.detail);
      onConnected();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect");
    }
  }

  return (
    <Stack spacing={3}>
      <Typography color="text.secondary">
        Jira Cloud email plus API token. The token is stored in the macOS Keychain, or a permission-restricted file on
        Linux.
      </Typography>
      <TextField
        label="Site URL"
        value={siteUrl}
        onChange={(e) => setSiteUrl(e.target.value)}
        placeholder="https://your-site.atlassian.net"
      />
      <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextField
        type="password"
        label="API token"
        value={apiToken}
        onChange={(e) => setApiToken(e.target.value)}
        helperText={<JiraTokenHint />}
      />
      <Button variant="contained" onClick={() => void connect()} disabled={!siteUrl || !email || !apiToken}>
        Test connection
      </Button>
      {detail ? <Typography color="success.main">{detail}</Typography> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Typography color="text.secondary">You can skip Jira and use GitHub issues only. Next still works.</Typography>
      <Box />
    </Stack>
  );
}
