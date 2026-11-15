import { Alert, Box, Button, Link, Paper, TextField, Typography } from "@mui/material";
import { JIRA_API_TOKEN_URL, type SettingsView } from "@flightdeck/shared";
import { useState } from "react";
import { api } from "../api.ts";
import { FormField } from "../ui/FormField.tsx";

export function JiraForm(props: { settings: SettingsView; onDone: (next: SettingsView) => void }) {
  const [siteUrl, setSiteUrl] = useState(props.settings.jiraSiteUrl);
  const [email, setEmail] = useState(props.settings.jiraEmail);
  const [token, setToken] = useState("");
  const [projectKey, setProjectKey] = useState(props.settings.jiraProjectKey);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function save() {
    setErr("");
    setOk("");
    try {
      const res = await api.saveJira({ siteUrl, email, token, projectKey });
      setOk("Jira settings saved");
      setToken("");
      props.onDone(res.settings);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save Jira settings");
    }
  }

  return (
    <Paper sx={{ p: 4, border: 1, borderColor: "divider" }} data-testid="jira-form">
      <Typography variant="h6" sx={{ mb: 1 }}>
        Jira Cloud
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Create a token at{" "}
        <Link href={JIRA_API_TOKEN_URL} target="_blank" rel="noreferrer">
          Atlassian API tokens
        </Link>
        . Saving stores it only; Flightdeck does not call Jira from this page.
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
        <FormField label="API token" hint={props.settings.hasJiraToken ? "Leave blank to keep the stored token." : "Stored in the Mac keychain when you run locally."}>
          <TextField
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={props.settings.hasJiraToken ? "Stored token" : ""}
            inputProps={{ "data-testid": "jira-token" }}
          />
        </FormField>
        <FormField label="Default project key">
          <TextField value={projectKey} onChange={(e) => setProjectKey(e.target.value)} inputProps={{ "data-testid": "jira-key" }} />
        </FormField>
      </Box>
      <Button variant="contained" onClick={() => void save()} data-testid="jira-save">
        Save
      </Button>
    </Paper>
  );
}
