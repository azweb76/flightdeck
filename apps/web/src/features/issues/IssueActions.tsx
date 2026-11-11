import { Box, Button } from "@primer/react";
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
    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
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
        variant="primary"
        disabled={!oneRepo || offline}
        onClick={() => {
          void api.startRun(issue.id).then((run) => nav(`/runs/${run.id}`));
        }}
      >
        Start (S)
      </Button>
      {issue.latestRunId ? (
        <Button
          disabled={offline}
          onClick={() => void api.fixRun(issue.latestRunId!).then((run) => nav(`/runs/${run.id}`))}
        >
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
