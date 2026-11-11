import { useState } from "react";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import type { Settings } from "@flightdeck/shared";
import { api } from "../api/index.ts";

export function JiraSettings({
  settings,
  onSave,
  setError,
}: {
  settings: Settings;
  onSave: (patch: Partial<Settings>) => Promise<void>;
  setError: (m: string | undefined) => void;
}) {
  const [siteUrl, setSiteUrl] = useState(settings.jiraSiteUrl);
  const [email, setEmail] = useState(settings.jiraEmail);
  const [apiToken, setApiToken] = useState("");
  const [jql, setJql] = useState(settings.jiraJql);
  const [status, setStatus] = useState<string>();

  async function connect() {
    setError(undefined);
    try {
      const r = await api.connectJira({ siteUrl, email, apiToken });
      setStatus(r.detail);
      await onSave({ jiraJql: jql });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Jira connect failed");
    }
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h3" sx={{ mb: 3 }}>
        Jira Cloud
      </Typography>
      <Stack spacing={3}>
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
          placeholder={settings.jiraConfigured ? "Stored in Keychain (or local secrets file)" : ""}
        />
        <TextField label="Board JQL" value={jql} onChange={(e) => setJql(e.target.value)} />
        <Button variant="contained" onClick={() => void connect()} disabled={!siteUrl || !email || !apiToken}>
          Test and save
        </Button>
        {status ? <Typography color="success.main">{status}</Typography> : null}
      </Stack>
    </Box>
  );
}
