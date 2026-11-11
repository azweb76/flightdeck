import { useEffect } from "react";
import { Alert, Box, Chip, CircularProgress, Stack, Tab, Tabs, Typography } from "@mui/material";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api/index.ts";
import { MarkdownEditor } from "../../ui/components/markdown/index.ts";
import { GoalEditor } from "./GoalEditor.tsx";
import { IssueActions } from "./IssueActions.tsx";
import { IssueRunsTab } from "./IssueRunsTab.tsx";
import { PrsTab } from "./PrsTab.tsx";
import { repoChipLabel } from "./repoDisplay.ts";
import { useIssue } from "./useIssue.ts";

export function IssueDetailPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "goal";
  const { issue, error, offline, offlineSources, syncErrors, load } = useIssue(id);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!issue) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const blocked =
        issue.source === "jira" ? offlineSources.jira : issue.source === "github" ? offlineSources.github : offline;
      if (blocked) return;
      if (e.key.toLowerCase() === "r") void api.refine(issue.id).then(load);
      if (e.key.toLowerCase() === "s" && issue.repos.length === 1) void api.startRun(issue.id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [issue, offlineSources, offline, load]);

  if (error) return <Alert severity="error" sx={{ m: 4 }}>{error}</Alert>;
  if (!issue) {
    return (
      <Box sx={{ p: 4 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }
  const sourceOffline =
    issue.source === "jira" ? offlineSources.jira : issue.source === "github" ? offlineSources.github : offline;

  return (
    <Box sx={{ p: 4 }}>
      <Typography color="text.secondary">
        <Link to="/issues">Issues</Link> / {issue.key}
      </Typography>
      <Typography variant="h2" sx={{ mt: 2 }}>
        {issue.key} {issue.title}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ my: 3, flexWrap: "wrap", gap: 1 }}>
        <Chip label={issue.source} size="small" color={issue.source === "jira" ? "primary" : "success"} />
        {issue.repos.map((r) => (
          <Chip key={`${r.owner}/${r.name}`} size="small" variant="outlined" label={repoChipLabel(r)} />
        ))}
        {issue.needsYou ? <Chip color="warning" size="small" label="Needs you" /> : null}
        {issue.viaPr ? <Chip size="small" variant="outlined" label="via PR" /> : null}
      </Stack>
      {syncErrors.map((e) => (
        <Alert key={e} severity="warning" sx={{ mb: 2 }}>
          {e}
        </Alert>
      ))}
      <IssueActions issue={issue} onChange={load} offline={sourceOffline} />
      {issue.comments?.length ? (
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontWeight: 600, mb: 2 }}>Comments</Typography>
          {issue.comments.map((c) => (
            <Box key={c.id} sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 600 }}>{c.author}</Typography>
              <MarkdownEditor id={`comment-${c.id}`} value={c.body} readOnly />
            </Box>
          ))}
        </Box>
      ) : null}
      <Tabs value={tab} onChange={(_, t) => setParams({ tab: t })} sx={{ mb: 3 }}>
        <Tab value="goal" label="Goal" />
        <Tab value="runs" label="Runs" />
        <Tab value="prs" label="PRs" />
      </Tabs>
      {tab === "goal" ? <GoalEditor issueId={issue.id} fallback={issue.body} offline={sourceOffline} /> : null}
      {tab === "runs" ? <IssueRunsTab issueId={issue.id} /> : null}
      {tab === "prs" ? <PrsTab issue={issue} onChange={load} /> : null}
    </Box>
  );
}
