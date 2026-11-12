import { Alert, Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import type { Issue } from "@flightdeck/shared";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.ts";
import { StartIdeaDialog } from "./StartIdeaDialog.tsx";

export function IssuesPage() {
  const nav = useNavigate();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string>();

  useEffect(() => {
    api
      .issues()
      .then((r) => setIssues(r.issues))
      .catch((e: Error) => setError(e.message));
  }, []);

  async function shapeExisting(issue: Issue) {
    setBusy(issue.id);
    setError("");
    try {
      const repo = issue.repoSlug || "acme/web";
      const session = await api.startShape({ repoSlug: repo, issueId: issue.id });
      nav(`/shape/${session.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start shaping");
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <Stack spacing={4}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4">My issues</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Shape a new idea, or refine something already on GitHub or Jira.
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => setOpen(true)} data-testid="new-idea">
          New idea
        </Button>
      </Stack>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {issues.length === 0 ? <EmptyIssues /> : <IssueList issues={issues} busy={busy} onShape={shapeExisting} />}
      <StartIdeaDialog
        open={open}
        onClose={() => setOpen(false)}
        onError={setError}
        onStarted={(id) => nav(`/shape/${id}`)}
      />
    </Stack>
  );
}

function EmptyIssues() {
  return (
    <Paper sx={{ p: 8, textAlign: "center", border: 1, borderColor: "divider" }} data-testid="empty-issues">
      <Typography variant="h6" gutterBottom>
        No issues yet
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 420, mx: "auto" }}>
        Start from a new idea. Nothing is created on GitHub or Jira until you click Save.
      </Typography>
    </Paper>
  );
}

function IssueList(props: { issues: Issue[]; busy?: string; onShape: (issue: Issue) => void }) {
  return (
    <Stack spacing={2}>
      {props.issues.map((issue) => (
        <Paper key={issue.id} sx={{ p: 3, border: 1, borderColor: "divider" }} data-testid="issue-row">
          <Stack direction={{ xs: "column", md: "row" }} gap={2} alignItems={{ md: "center" }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 0.5 }}>
                <Chip size="small" label={issue.source === "jira" ? "Jira" : "GitHub"} />
                <Typography variant="caption" color="text.secondary">
                  {issue.key}
                </Typography>
              </Stack>
              <Typography variant="h6">{issue.title}</Typography>
            </Box>
            <Stack direction="row" gap={1}>
              <Button
                variant="outlined"
                disabled={props.busy === issue.id}
                onClick={() => props.onShape(issue)}
                data-testid={`shape-${issue.key}`}
              >
                Shape
              </Button>
              <Button variant="contained" disabled data-testid={`start-${issue.key}`}>
                Start
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
