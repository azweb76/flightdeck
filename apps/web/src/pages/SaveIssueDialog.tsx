import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import type { Issue, ShapeSession } from "@flightdeck/shared";
import { useEffect, useState } from "react";
import { api } from "../api.ts";
import { FormField } from "../ui/FormField.tsx";

export function SaveIssueDialog(props: {
  open: boolean;
  session: ShapeSession;
  onClose: () => void;
  onSaved: (issue: Issue) => void;
}) {
  const [tracker, setTracker] = useState<"jira" | "github" | "">("");
  const [projectKey, setProjectKey] = useState("PROJ");
  const [repoSlug, setRepoSlug] = useState(props.session.repoSlug);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (props.open) {
      setLocalError("");
      setTracker("");
    }
  }, [props.open]);

  async function save() {
    if (tracker !== "jira" && tracker !== "github") {
      setLocalError("Choose Jira or GitHub");
      return;
    }
    setBusy(true);
    try {
      const issue = await api.saveShape(props.session.id, { tracker, projectKey, repoSlug });
      setLocalError("");
      props.onSaved(issue);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="sm">
      <DialogTitle>Save issue</DialogTitle>
      <DialogContent>
        {localError ? (
          <Alert severity="error" sx={{ mb: 2 }} data-testid="save-error">
            {localError}
          </Alert>
        ) : null}
        <FormField label="Tracker" hint="Choose each time. Nothing is created until Save.">
          <Select
            value={tracker}
            displayEmpty
            onChange={(e) => setTracker(e.target.value as "jira" | "github" | "")}
            data-testid="tracker-select"
          >
            <MenuItem value="">
              <em>Choose Jira or GitHub</em>
            </MenuItem>
            <MenuItem value="github">GitHub</MenuItem>
            <MenuItem value="jira">Jira</MenuItem>
          </Select>
        </FormField>
        {tracker === "jira" ? (
          <FormField label="Jira project key">
            <TextField value={projectKey} onChange={(e) => setProjectKey(e.target.value)} inputProps={{ "data-testid": "jira-project" }} />
          </FormField>
        ) : null}
        {tracker === "github" ? (
          <FormField label="GitHub repo">
            <TextField value={repoSlug} onChange={(e) => setRepoSlug(e.target.value)} inputProps={{ "data-testid": "gh-repo" }} />
          </FormField>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={props.onClose}>Cancel</Button>
        <Button variant="contained" disabled={busy} onClick={save} data-testid="confirm-save">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
