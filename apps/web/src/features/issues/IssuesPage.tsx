import { Alert, Box, Button, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import { Link, useSearchParams } from "react-router-dom";
import type { IssueStage } from "@flightdeck/shared";
import { BoardColumn } from "./BoardColumn.tsx";
import { useAssignedIssues } from "./useAssignedIssues.ts";

const STAGES: IssueStage[] = ["new", "refined", "running", "pr_open"];

export function IssuesPage() {
  const [params, setParams] = useSearchParams();
  const source = params.get("source") ?? "all";
  const repo = params.get("repo") ?? undefined;
  const { issues, errors, offline, offlineSources, load } = useAssignedIssues(source, repo);

  function setSource(next: string) {
    const p = new URLSearchParams(params);
    if (next === "all") p.delete("source");
    else p.set("source", next);
    setParams(p);
  }

  return (
    <Box sx={{ p: 4, minHeight: "100%" }}>
      <Typography variant="h2" sx={{ mb: 3 }}>
        Issues
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: "wrap", alignItems: "center", gap: 1 }}>
        {(["all", "jira", "github"] as const).map((s) => (
          <Chip
            key={s}
            clickable
            color={source === s ? "primary" : "default"}
            variant={source === s ? "filled" : "outlined"}
            label={s === "all" ? "All sources" : s === "jira" ? "Jira" : "GitHub"}
            onClick={() => setSource(s)}
          />
        ))}
        <Chip variant="outlined" label={`Repo: ${repo ?? "all"}`} />
        <Button component={Link} to="/issues/new?kind=github" size="small">
          New GitHub issue
        </Button>
        <Button component={Link} to="/issues/new?kind=jira" size="small">
          New Jira issue
        </Button>
        <Button component={Link} to="/issues/new?kind=adhoc" size="small">
          Ad-hoc task
        </Button>
        <Button size="small" onClick={() => load(true)}>
          Refresh
        </Button>
      </Stack>
      {offline ? <Alert severity="warning" sx={{ mb: 2 }}>Offline — showing cached issues. Start and write-backs are disabled.</Alert> : null}
      {!offline && offlineSources.jira ? <Alert severity="warning" sx={{ mb: 2 }}>Jira sync failed. GitHub issues can still start.</Alert> : null}
      {!offline && offlineSources.github ? <Alert severity="warning" sx={{ mb: 2 }}>GitHub sync failed. Jira issues can still start.</Alert> : null}
      {errors.map((e) => (
        <Alert key={e} severity="warning" sx={{ mb: 2 }}>
          {e}
        </Alert>
      ))}
      {!issues ? (
        <CircularProgress size={20} />
      ) : (
        <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start", overflowX: "auto", pb: 3 }}>
          {STAGES.map((stage) => (
            <BoardColumn key={stage} stage={stage} issues={issues.filter((i) => i.stage === stage)} />
          ))}
        </Box>
      )}
    </Box>
  );
}
