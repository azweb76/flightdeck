import { Alert, Box, Button, CircularProgress, IconButton, Menu, MenuItem, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { IssueStage } from "@flightdeck/shared";
import { PlusIcon, RefreshIcon } from "../ui/icons.tsx";
import { BoardColumn } from "./BoardColumn.tsx";
import { BoardFilters } from "./BoardFilters.tsx";
import { useAssignedIssues } from "./useAssignedIssues.ts";

const STAGES: IssueStage[] = ["new", "refined", "running", "pr_open"];

export function IssuesPage() {
  const [params, setParams] = useSearchParams();
  const source = params.get("source") ?? "all";
  const repo = params.get("repo") ?? undefined;
  const { issues, errors, offline, offlineSources, prSync, load } = useAssignedIssues(source, repo);
  const [menu, setMenu] = useState<HTMLElement | null>(null);

  function setSource(next: string) {
    const p = new URLSearchParams(params);
    if (next === "all") p.delete("source");
    else p.set("source", next);
    setParams(p);
  }

  return (
    <Box sx={{ p: 3, minHeight: "100%" }}>
      <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: "center" }}>
        <Typography variant="h2" sx={{ flex: 1 }}>
          Issues
        </Typography>
        <Button size="small" variant="contained" onClick={(e) => setMenu(e.currentTarget)} startIcon={<PlusIcon />}>
          New
        </Button>
        <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)}>
          <MenuItem component={Link} to="/issues/new?kind=github" onClick={() => setMenu(null)}>
            GitHub issue
          </MenuItem>
          <MenuItem component={Link} to="/issues/new?kind=jira" onClick={() => setMenu(null)}>
            Jira issue
          </MenuItem>
          <MenuItem component={Link} to="/issues/new?kind=adhoc" onClick={() => setMenu(null)}>
            Ad-hoc task
          </MenuItem>
        </Menu>
        <IconButton size="small" aria-label="Refresh" onClick={() => load(true)}>
          <RefreshIcon />
        </IconButton>
      </Stack>
      <BoardFilters source={source} repo={repo} params={params} setSource={setSource} setParams={setParams} />
      {offline ? <Alert severity="warning" sx={{ mb: 2 }}>Offline — showing cached issues. Start and write-backs are disabled until the network is back.</Alert> : null}
      {!offline && offlineSources.jira ? <Alert severity="warning" sx={{ mb: 2 }}>Jira is unreachable. GitHub issues can still start and write back.</Alert> : null}
      {!offline && offlineSources.github ? <Alert severity="warning" sx={{ mb: 2 }}>GitHub is unreachable. Jira issues can still start and write back.</Alert> : null}
      {prSync?.error && !errors.includes(prSync.error) ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {prSync.error}
        </Alert>
      ) : null}
      {errors.map((e) => (
        <Alert key={e} severity="warning" sx={{ mb: 2 }}>
          {e}
        </Alert>
      ))}
      {!issues ? (
        <CircularProgress size={20} />
      ) : (
        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start", overflowX: "auto", pb: 3 }}>
          {STAGES.map((stage) => (
            <BoardColumn key={stage} stage={stage} issues={issues.filter((i) => i.stage === stage)} />
          ))}
        </Box>
      )}
    </Box>
  );
}
