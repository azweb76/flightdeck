import { useState } from "react";
import { Box, Button, FormControl, Text, TextInput } from "@primer/react";
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
      <Text as="h3" sx={{ fontSize: 2, fontWeight: 600, display: "block", mb: 3 }}>
        Jira Cloud
      </Text>
      <Box sx={{ display: "grid", gap: 3 }}>
        <FormControl>
          <FormControl.Label>Site URL</FormControl.Label>
          <TextInput
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            placeholder="https://your-site.atlassian.net"
          />
        </FormControl>
        <FormControl>
          <FormControl.Label>Email</FormControl.Label>
          <TextInput value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormControl>
        <FormControl>
          <FormControl.Label>API token</FormControl.Label>
          <TextInput
            type="password"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            placeholder={settings.jiraConfigured ? "Stored in Keychain (or local secrets file)" : ""}
          />
        </FormControl>
        <FormControl>
          <FormControl.Label>Board JQL</FormControl.Label>
          <TextInput value={jql} onChange={(e) => setJql(e.target.value)} />
        </FormControl>
        <Button variant="primary" onClick={() => void connect()} disabled={!siteUrl || !email || !apiToken}>
          Test and save
        </Button>
        {status ? <Text sx={{ color: "success.fg" }}>{status}</Text> : null}
      </Box>
    </Box>
  );
}
