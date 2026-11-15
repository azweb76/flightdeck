import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";
import type { Issue, PreflightCheck, ShapeSession } from "@flightdeck/shared";
import { useEffect, useState } from "react";
import { api } from "../api.ts";
import { RepoPicker } from "../features/repos/index.ts";
import { TrackerChoice, usePreflight } from "../preflight/index.ts";
import { ContainedButton } from "../ui/ContainedButton.tsx";
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
  const preflight = usePreflight();
  const ghBlock = preflight.block("saveGithub");
  const jiraBlock = preflight.block("saveJira");
  const blocked = tracker === "github" ? ghBlock : tracker === "jira" ? jiraBlock : undefined;

  useEffect(() => {
    if (props.open) {
      setLocalError("");
      setTracker("");
      setRepoSlug(props.session.repoSlug);
    }
  }, [props.open, props.session.repoSlug]);

  async function save() {
    if (tracker !== "jira" && tracker !== "github") {
      setLocalError("Choose Jira or GitHub");
      return;
    }
    if (!repoSlug.includes("/")) {
      setLocalError("Pick a repo for this issue");
      return;
    }
    if (blocked) {
      setLocalError(`${blocked.detail}${blocked.fix ? `.\nFix: ${blocked.fix}` : ""}`);
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
          ghBlock={ghBlock}
          jiraBlock={jiraBlock}
          onTracker={setTracker}
          onProjectKey={setProjectKey}
          onRepoSlug={setRepoSlug}
        />
        <TrackerGateHint blocked={blocked} />
      </DialogContent>
        <SaveActions
          busy={busy}
          blocked={Boolean(blocked) || !repoSlug.includes("/")}
          onClose={props.onClose}
          onSave={() => void save()}
        />
    </Dialog>
  );
}

function SaveActions(props: { busy: boolean; blocked: boolean; onClose: () => void; onSave: () => void }) {
  const off = props.busy || props.blocked;
  return (
    <DialogActions sx={{ px: 3, pb: 2.5 }}>
      <Button onMouseDown={props.onClose}>Cancel</Button>
      <ContainedButton disabled={off} onClick={props.onSave} data-testid="confirm-save">
        Save
      </ContainedButton>
    </DialogActions>
  );
}

function TrackerGateHint(props: { blocked?: PreflightCheck }) {
  if (!props.blocked) return null;
  return (
    <Alert
      severity="warning"
      sx={{ mt: 1, bgcolor: "#ffd60a", color: "#1d1d1f", "& .MuiAlert-icon": { color: "#1d1d1f" } }}
      data-testid="tracker-gate-hint"
    >
      {props.blocked.detail}
      {props.blocked.fix ? (
        <>
          <br />
          Fix: {props.blocked.fix}
        </>
      ) : null}
    </Alert>
  );
}

function TrackerFields(props: {
  tracker: "jira" | "github" | "";
  projectKey: string;
  repoSlug: string;
  ghBlock?: PreflightCheck;
  jiraBlock?: PreflightCheck;
  onTracker: (v: "jira" | "github") => void;
  onProjectKey: (v: string) => void;
  onRepoSlug: (v: string) => void;
}) {
  return (
    <>
      <FormField label="Tracker" hint="Choose each time. Nothing is created until Save.">
        <Stack spacing={1.5} data-testid="tracker-select">
          <TrackerChoice
            title="GitHub"
            testId="tracker-github"
            selected={props.tracker === "github"}
            block={props.ghBlock}
            onSelect={() => props.onTracker("github")}
          />
          <TrackerChoice
            title="Jira"
            testId="tracker-jira"
            selected={props.tracker === "jira"}
            block={props.jiraBlock}
            onSelect={() => props.onTracker("jira")}
          />
        </Stack>
      </FormField>
      {props.tracker === "jira" && !props.jiraBlock ? (
        <>
          <FormField label="Jira project key">
            <TextField value={props.projectKey} onChange={(e) => props.onProjectKey(e.target.value)} inputProps={{ "data-testid": "jira-project" }} />
          </FormField>
          <FormField label="Repository" hint="Written as a repo:org/repo Jira label so Start can find the code.">
            <RepoPicker value={props.repoSlug} onChange={props.onRepoSlug} />
          </FormField>
        </>
      ) : null}
      {props.tracker === "github" && !props.ghBlock ? (
        <FormField label="GitHub repo" hint="The issue is created in this repository.">
          <RepoPicker value={props.repoSlug} onChange={props.onRepoSlug} />
        </FormField>
      ) : null}
    </>
  );
}
