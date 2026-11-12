import { Alert, Box, Button, Chip, Link, Paper, Stack, Tooltip, Typography } from "@mui/material";
import type { Issue } from "@flightdeck/shared";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.ts";
import { useAppEvents } from "../useAppEvents.ts";
import { RepoPickDialog } from "./RepoPickDialog.tsx";
import { StartIdeaDialog } from "./StartIdeaDialog.tsx";

export function IssuesPage() {
  const nav = useNavigate();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string>();
  const [pick, setPick] = useState<Issue>();

  const refresh = useCallback(async () => {
    setError("");
    try {
      setIssues((await api.issues()).issues);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load issues");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  useAppEvents(
    useCallback(
      (ev) => {
        if (ev.type === "issues.updated") void refresh();
      },
      [refresh],
    ),
  );

  async function shapeExisting(issue: Issue, repoSlug?: string) {
    const repo = repoSlug ?? issue.repoSlug;
    if (!repo) {
      setPick(issue);
      return;
    }
    setBusy(issue.id);
    setError("");
    try {
      if (!issue.repoSlug) await api.setIssueRepo(issue.id, repo);
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
        <Stack direction="row" gap={1}>
          <Button variant="outlined" onClick={() => void refresh()} data-testid="refresh-issues">
            Refresh
          </Button>
          <Button variant="contained" onClick={() => setOpen(true)} data-testid="new-idea">
            New idea
          </Button>
        </Stack>
      </Stack>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {issues.length === 0 ? <EmptyIssues /> : <IssueList issues={issues} busy={busy} onShape={(i) => void shapeExisting(i)} />}
      <StartIdeaDialog open={open} onClose={() => setOpen(false)} onError={setError} onStarted={(id) => nav(`/shape/${id}`)} />
      <RepoPickDialog
        open={Boolean(pick)}
        title="Pick a repo for this Jira issue"
        onClose={() => setPick(undefined)}
        onPicked={(slug) => {
          const issue = pick;
          setPick(undefined);
          if (issue) void shapeExisting(issue, slug);
        }}
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
        Start from a new idea, or hit Refresh after connecting GitHub and Jira in Settings. Nothing is created on a
        tracker until you click Save.
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
              <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.75 }}>
                <Chip size="small" color={issue.source === "jira" ? "warning" : "info"} label={issue.source === "jira" ? "Jira" : "GitHub"} />
                {issue.saved ? <Chip size="small" variant="outlined" label="Saved" /> : <Chip size="small" variant="outlined" label="Draft" />}
                <Typography variant="caption" color="text.secondary">
                  {issue.key}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Updated {formatWhen(issue.updatedAt)}
                </Typography>
              </Stack>
              <Typography variant="h6">{issue.title}</Typography>
              {issue.url ? (
                <Link href={issue.url} target="_blank" rel="noreferrer" underline="hover" variant="body2">
                  Open on {issue.source === "jira" ? "Jira" : "GitHub"}
                </Link>
              ) : null}
            </Box>
            <Stack direction="row" gap={1}>
              <Button variant="outlined" disabled={props.busy === issue.id} onClick={() => props.onShape(issue)} data-testid={`shape-${issue.key}`}>
                Shape
              </Button>
              <Tooltip title="Coming in Phase 2">
                <span>
                  <Button variant="text" disabled data-testid={`start-${issue.key}`}>
                    Start
                  </Button>
                </span>
              </Tooltip>
            </Stack>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
