import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import type { Issue } from "@flightdeck/shared";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, type NavigateFunction } from "react-router-dom";
import { api } from "../api.ts";
import { GatedButton, PreflightBanner } from "../preflight/index.ts";
import { useAppEvents } from "../useAppEvents.ts";
import { IssueList } from "./IssueList.tsx";
import { RepoPickDialog } from "./RepoPickDialog.tsx";
import { StartIdeaDialog } from "./StartIdeaDialog.tsx";

export function IssuesPage() {
  const nav = useNavigate();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string>();
  const [pick, setPick] = useState<Issue>();
  const [pickMode, setPickMode] = useState<"shape" | "start">("shape");

  const pull = useCallback(async (mode: "get" | "sync") => {
    setError("");
    try {
      const body = mode === "sync" ? await api.syncIssues() : await api.issues();
      setIssues(body.issues);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load issues");
    }
  }, []);

  useEffect(() => {
    void pull("get");
  }, [pull]);
  useAppEvents(
    useCallback(
      (ev) => {
        if (ev.type === "issues.updated") void pull("get");
      },
      [pull],
    ),
  );

  async function go(mode: "shape" | "start", issue: Issue, repoSlug?: string) {
    setPickMode(mode);
    if (mode === "start") await startChangeForIssue(issue, repoSlug, { setPick, setBusy, setError, nav, setPickMode });
    else await startShapeForIssue(issue, repoSlug, { setPick, setBusy, setError, nav });
  }

  return (
    <Stack spacing={4}>
      <PreflightBanner />
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4">My issues</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Shape a new idea, or start a change on a shaped issue.
          </Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <Button variant="outlined" onClick={() => void pull("sync")} data-testid="refresh-issues">
            Refresh
          </Button>
          <GatedButton gate="shape" variant="contained" placement="left" onClick={() => setOpen(true)} testId="new-idea">
            New idea
          </GatedButton>
        </Stack>
      </Stack>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {issues.length === 0 ? (
        <EmptyIssues />
      ) : (
        <IssueList
          issues={issues}
          busy={busy}
          onShape={(i) => void go("shape", i)}
          onStart={(i) => void go("start", i)}
        />
      )}
      <StartIdeaDialog open={open} onClose={() => setOpen(false)} onError={setError} onStarted={(id) => nav(`/shape/${id}`)} />
      <RepoPickDialog
        open={Boolean(pick)}
        title="Pick a repo for this Jira issue"
        onClose={() => setPick(undefined)}
        onPicked={(slug) => {
          const issue = pick;
          setPick(undefined);
          if (!issue) return;
          void go(pickMode, issue, slug);
        }}
      />
    </Stack>
  );
}

async function startShapeForIssue(
  issue: Issue,
  repoSlug: string | undefined,
  ui: {
    setPick: (issue: Issue | undefined) => void;
    setBusy: (id: string | undefined) => void;
    setError: (msg: string) => void;
    nav: NavigateFunction;
  },
): Promise<void> {
  const repo = repoSlug ?? issue.repoSlug;
  if (!repo) {
    ui.setPick(issue);
    return;
  }
  ui.setBusy(issue.id);
  ui.setError("");
  try {
    if (!issue.repoSlug) await api.setIssueRepo(issue.id, repo);
    const session = await api.startShape({ repoSlug: repo, issueId: issue.id });
    ui.nav(`/shape/${session.id}`);
  } catch (e) {
    ui.setError(e instanceof Error ? e.message : "Could not start shaping");
  } finally {
    ui.setBusy(undefined);
  }
}

async function startChangeForIssue(
  issue: Issue,
  repoSlug: string | undefined,
  ui: {
    setPick: (issue: Issue | undefined) => void;
    setBusy: (id: string | undefined) => void;
    setError: (msg: string) => void;
    nav: NavigateFunction;
    setPickMode: (mode: "shape" | "start") => void;
  },
): Promise<void> {
  const repo = repoSlug ?? issue.repoSlug;
  if (!repo) {
    ui.setPickMode("start");
    ui.setPick(issue);
    return;
  }
  ui.setBusy(issue.id);
  ui.setError("");
  try {
    if (!issue.repoSlug) await api.setIssueRepo(issue.id, repo);
    const change = await api.startChange(issue.id);
    ui.nav(`/runs/${change.id}`);
  } catch (e) {
    ui.setError(e instanceof Error ? e.message : "Could not start the change");
  } finally {
    ui.setBusy(undefined);
  }
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
