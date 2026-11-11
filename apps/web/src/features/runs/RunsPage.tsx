import { useEffect, useState } from "react";
import { Box, Chip, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { SpendBanner } from "./SpendBanner.tsx";
import type { Run } from "@flightdeck/shared";
import { useNavigate } from "react-router-dom";
import { api, subscribeEvents } from "../api/index.ts";
import { elapsedLabel, sortRuns } from "./sortRuns.ts";

type Spend = { todayUsd: number; capUsd: number; blocked: boolean; reason?: string };

export function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [spend, setSpend] = useState<Spend>();
  const nav = useNavigate();

  function load() {
    void api.runs().then((r) => {
      setRuns(r.runs);
      if (r.spend) setSpend(r.spend);
    });
  }

  useEffect(() => {
    load();
    return subscribeEvents((type) => {
      if (!type || type === "runs.updated" || type === "run.event" || type === "questions.updated") load();
    });
  }, []);

  const rows = sortRuns(runs);
  return (
    <Box sx={{ p: 3, minHeight: "100%" }}>
      <Typography variant="h2">Runs</Typography>
      <SpendBanner spend={spend} onChange={load} />
      {rows.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          No runs yet. Start one from an issue.
        </Typography>
      ) : (
        <Table size="small" sx={{ mt: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>Issue / PR</TableCell>
              <TableCell>Repo</TableCell>
              <TableCell>Phase</TableCell>
              <TableCell>Elapsed</TableCell>
              <TableCell>Cost</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((run) => (
              <TableRow
                key={run.id}
                hover
                onClick={() => nav(`/runs/${run.id}`)}
                sx={{
                  cursor: "pointer",
                  borderLeft: run.status === "asking" ? "3px solid" : "3px solid transparent",
                  borderLeftColor: run.status === "asking" ? "warning.main" : "transparent",
                }}
              >
                <TableCell>
                  {run.issueKey}
                  {run.prNumber ? ` · PR #${run.prNumber}` : ""}
                </TableCell>
                <TableCell sx={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12 }}>{run.repoSlug}</TableCell>
                <TableCell>{run.phase}</TableCell>
                <TableCell>{elapsedLabel(run)}</TableCell>
                <TableCell>
                  ${run.costUsd.toFixed(2)} / ${run.capUsd.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={run.status === "asking" ? "warning" : run.status === "interrupted" ? "default" : "default"}
                    label={run.status === "asking" ? "Waiting on you" : run.status}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
