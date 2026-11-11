import { Stack, Button } from "@mui/material";
import type { Issue } from "@flightdeck/shared";
import { useNavigate } from "react-router-dom";
import { api } from "../api/index.ts";
import { RepoChips } from "./RepoChips.tsx";

export function IssueActions({
  issue,
  onChange,
  offline,
}: {
  issue: Issue;
  onChange: () => void;
  offline?: boolean;
}) {
  const nav = useNavigate();
  const oneRepo = issue.repos.length === 1;
  return (
    <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", mb: 3, gap: 1 }}>
      <RepoChips issue={issue} onChange={onChange} />
      <Button
        disabled={offline}
        onClick={() => {
          void api.refine(issue.id).then(() => nav(`/issues/${encodeURIComponent(issue.id)}?tab=goal`));
        }}
      >
        Refine (R)
      </Button>
      <Button
        variant="contained"
        disabled={!oneRepo || offline}
        onClick={() => {
          void api.startRun(issue.id).then((run) => nav(`/runs/${run.id}`));
        }}
      >
        Start (S)
      </Button>
      {issue.latestRunId ? (
        <Button disabled={offline} onClick={() => void api.fixRun(issue.latestRunId!).then((run) => nav(`/runs/${run.id}`))}>
          Fix
        </Button>
      ) : null}
      {issue.prs?.some((p) => p.role === "mine") ? (
        <Button onClick={() => nav(`/issues/${encodeURIComponent(issue.id)}?tab=prs`)}>PR Open</Button>
      ) : null}
      {issue.repoWarning === "multiple" ? (
        <Button onClick={() => void api.splitIssue(issue.id).then(onChange)}>Split into sub-issues</Button>
      ) : null}
    </Stack>
  );
}
