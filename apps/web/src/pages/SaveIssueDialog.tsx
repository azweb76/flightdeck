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
import { usePreflight } from "../preflight/PreflightContext.tsx";
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
  const ghBlock = usePreflight().block("saveGithub");
  const jiraBlock = usePreflight().block("saveJira");
  const blocked = tracker === "github" ? ghBlock : tracker === "jira" ? jiraBlock : undefined;

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
        <TrackerFields
          tracker={tracker}
          projectKey={projectKey}
          repoSlug={repoSlug}
          ghBlock={Boolean(ghBlock)}
          jiraBlock={Boolean(jiraBlock)}
          onTracker={setTracker}
          onProjectKey={setProjectKey}
          onRepoSlug={setRepoSlug}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={props.onClose}>Cancel</Button>
        <Button variant="contained" disabled={busy || Boolean(blocked)} onClick={save} data-testid="confirm-save">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function TrackerFields(props: {
  tracker: "jira" | "github" | "";
  projectKey: string;
  repoSlug: string;
  ghBlock: boolean;
  jiraBlock: boolean;
  onTracker: (v: "jira" | "github" | "") => void;
  onProjectKey: (v: string) => void;
  onRepoSlug: (v: string) => void;
}) {
  return (
    <>
      <FormField label="Tracker" hint="Choose each time. Nothing is created until Save.">
        <Select
          value={props.tracker}
          displayEmpty
          onChange={(e) => props.onTracker(e.target.value as "jira" | "github" | "")}
          data-testid="tracker-select"
        >
          <MenuItem value="">
            <em>Choose Jira or GitHub</em>
          </MenuItem>
          <MenuItem value="github" disabled={props.ghBlock} data-testid="tracker-github">
            GitHub{props.ghBlock ? " (needs gh)" : ""}
          </MenuItem>
          <MenuItem value="jira" disabled={props.jiraBlock} data-testid="tracker-jira">
            Jira{props.jiraBlock ? " (needs Jira)" : ""}
          </MenuItem>
        </Select>
      </FormField>
      {props.tracker === "jira" ? (
        <FormField label="Jira project key">
          <TextField value={props.projectKey} onChange={(e) => props.onProjectKey(e.target.value)} inputProps={{ "data-testid": "jira-project" }} />
        </FormField>
      ) : null}
      {props.tracker === "github" ? (
        <FormField label="GitHub repo">
          <TextField value={props.repoSlug} onChange={(e) => props.onRepoSlug(e.target.value)} inputProps={{ "data-testid": "gh-repo" }} />
        </FormField>
      ) : null}
    </>
  );
}
