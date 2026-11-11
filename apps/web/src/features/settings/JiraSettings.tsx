import { useState } from "react";
import { Button, Stack, Typography } from "@mui/material";
import type { Settings } from "@flightdeck/shared";
import { api } from "../api/index.ts";
import { FormField } from "../../ui/components/form-field/index.ts";
import { JiraTokenHint } from "../jira/index.ts";
import { SettingsCard } from "./SettingsCard.tsx";

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
  const ready = Boolean(siteUrl.trim() && email.trim() && (apiToken.trim() || settings.jiraConfigured));

  async function connect() {
    setError(undefined);
    try {
      if (apiToken.trim()) {
        const r = await api.connectJira({ siteUrl, email, apiToken });
        setStatus(r.detail);
      }
      await onSave({ jiraJql: jql, jiraSiteUrl: siteUrl, jiraEmail: email });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Jira connect failed");
    }
  }

  return (
    <SettingsCard title="Jira Cloud">
      <Stack spacing={2}>
        <FormField
          label="Site URL"
          value={siteUrl}
          onChange={(e) => setSiteUrl(e.target.value)}
          placeholder="https://your-site.atlassian.net"
          helperText="Your Atlassian site, including https://"
        />
        <FormField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <FormField
          type="password"
          label="API token"
          value={apiToken}
          onChange={(e) => setApiToken(e.target.value)}
          helperText={<JiraTokenHint keepStored={settings.jiraConfigured} />}
        />
        <FormField
          label="Board JQL"
          value={jql}
          onChange={(e) => setJql(e.target.value)}
          helperText="Assigned issues matching this JQL appear on the board."
        />
        <Button variant="contained" color="primary" onClick={() => void connect()} disabled={!ready}>
          Test and save
        </Button>
        {status ? <Typography color="success.main">{status}</Typography> : null}
      </Stack>
    </SettingsCard>
  );
}
