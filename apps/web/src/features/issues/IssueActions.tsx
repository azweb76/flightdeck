import { Box, Button } from "@primer/react";
import type { Issue } from "@flightdeck/shared";
import { useNavigate } from "react-router-dom";
import { api } from "../api/index.ts";

export function IssueActions({
  issue,
  onChange,
}: {
  issue: Issue;
  onChange: () => void;
}) {
  const nav = useNavigate();
  const oneRepo = issue.repos.filter((r) => r.registered).length === 1;
  return (
    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
      <Button
        onClick={() => {
          void api.refine(issue.id).then(() => nav(`/issues/${encodeURIComponent(issue.id)}?tab=goal`));
        }}
      >
        Refine (R)
      </Button>
      <Button
        variant="primary"
        disabled={!oneRepo}
        onClick={() => {
          void api.startRun(issue.id).then((run) => nav(`/runs/${run.id}`));
        }}
      >
        Start (S)
      </Button>
      {issue.latestRunId ? (
        <Button onClick={() => void api.fixRun(issue.latestRunId!).then((run) => nav(`/runs/${run.id}`))}>
          Fix
        </Button>
      ) : null}
      {issue.repoWarning === "multiple" ? (
        <Button
          onClick={() => {
            void api.splitIssue(issue.id).then(onChange);
          }}
        >
          Split into sub-issues
        </Button>
      ) : null}
    </Box>
  );
}
