import { useEffect, useState } from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import type { Run } from "@flightdeck/shared";
import { Link } from "react-router-dom";
import { api } from "../api/index.ts";

export function IssueRunsTab({ issueId }: { issueId: string }) {
  const [runs, setRuns] = useState<Run[]>([]);
  useEffect(() => {
    void api.runs().then((r) => setRuns(r.runs.filter((x) => x.issueId === issueId)));
  }, [issueId]);
  if (!runs.length) return <Typography color="text.secondary">No runs yet.</Typography>;
  return (
    <Stack spacing={2}>
      {runs.map((run) => (
        <Box key={run.id} sx={{ border: "1px solid", borderColor: "divider", p: 3, borderRadius: 1 }}>
          <Link to={`/runs/${run.id}`}>
            Run {run.id} · {run.repoSlug} · {run.phase}
          </Link>
          <Typography color="text.secondary">{run.status}</Typography>
          {run.prUrl ? <Chip size="small" color="success" label={run.prUrl} component="a" href={run.prUrl} clickable /> : null}
        </Box>
      ))}
    </Stack>
  );
}
