import { useEffect, useState } from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import type { Run } from "@flightdeck/shared";
import { Link } from "react-router-dom";
import { api } from "../api/index.ts";

export function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  useEffect(() => {
    void api.runs().then((r) => setRuns(r.runs));
  }, []);
  return (
    <Box sx={{ p: 4, minHeight: "100%" }}>
      <Typography variant="h2">Runs</Typography>
      {runs.length === 0 ? <Typography color="text.secondary">No runs yet. Start one from an issue.</Typography> : null}
      <Stack spacing={2} sx={{ mt: 3 }}>
        {runs.map((run) => (
          <Box
            key={run.id}
            sx={{
              border: "1px solid",
              borderColor: run.status === "asking" ? "warning.main" : "divider",
              p: 3,
              borderRadius: 1,
              bgcolor: "background.paper",
            }}
          >
            <Link to={`/runs/${run.id}`}>
              {run.issueKey} on {run.repoSlug}
            </Link>
            <Typography color="text.secondary">
              {run.phase} · round {run.round}/{run.maxRounds} · ${run.costUsd.toFixed(2)} of ${run.capUsd.toFixed(2)}
            </Typography>
            <Chip size="small" label={run.status} sx={{ mt: 1 }} />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
