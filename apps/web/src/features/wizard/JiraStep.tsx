import { Box, Button, FormControl, Text, TextInput } from "@primer/react";
import { useState } from "react";
import { api } from "../api/index.ts";

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
    <Box sx={{ display: "grid", gap: 3 }}>
      <Text sx={{ color: "fg.muted" }}>
        Jira Cloud email plus API token. The token is stored in the macOS Keychain, or a
        permission-restricted file on Linux.
      </Text>
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
        <TextInput type="password" value={apiToken} onChange={(e) => setApiToken(e.target.value)} />
      </FormControl>
      <Button variant="primary" onClick={() => void connect()} disabled={!siteUrl || !email || !apiToken}>
        Test connection
      </Button>
      {detail ? <Text sx={{ color: "success.fg" }}>{detail}</Text> : null}
      {error ? <Text sx={{ color: "danger.fg" }}>{error}</Text> : null}
      <Text sx={{ color: "fg.subtle", fontSize: 1 }}>
        You can skip Jira and use GitHub issues only. Next still works.
      </Text>
    </Box>
  );
}
