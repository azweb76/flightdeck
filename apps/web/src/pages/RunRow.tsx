import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import type { Change } from "@flightdeck/shared";
import { useNavigate } from "react-router-dom";
import { archiveDisabled, chipColor, chipSx, formatElapsed, stageLabel, statusChip } from "./changeStatus.ts";

export function RunRow(props: {
  change: Change;
  now: number;
  onArchive: (id: string) => void;
  onResume: (id: string) => void;
}) {
  const { change } = props;
  const nav = useNavigate();
  const needsYou = change.status === "asking" || change.status === "needs_dan";
  const end = change.status === "done" || change.status === "archived" || change.status === "cap_hit" ? Date.parse(change.updatedAt) : props.now;
  return (
    <Paper
      sx={{ px: 2, py: 1.5, border: 1, borderColor: needsYou ? "warning.light" : "divider", cursor: "pointer" }}
      data-testid="run-row"
      onClick={() => nav(`/runs/${change.id}`)}
    >
      <Stack direction={{ xs: "column", md: "row" }} gap={1.5} alignItems={{ md: "center" }}>
        <Chip
          size="small"
          color={chipColor(change.status, change.interrupted)}
          label={statusChip(change.status, change.interrupted)}
          data-testid={`run-status-${change.issueKey}`}
          sx={chipSx(change.status, change.interrupted)}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap>
            {change.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" data-testid={`run-meta-${change.issueKey}`}>
            {stageLabel(change.status, change.interrupted)} · {change.repoSlug} · {change.issueKey} · ${change.costUsd.toFixed(2)} ·{" "}
            {formatElapsed(change.createdAt, end)}
          </Typography>
        </Box>
        <Stack direction="row" gap={1} onClick={(e) => e.stopPropagation()}>
          {change.interrupted ? (
            <Button variant="contained" onClick={() => props.onResume(change.id)} data-testid={`resume-${change.issueKey}`}>
              Resume
            </Button>
          ) : null}
          <Button
            variant="outlined"
            disabled={archiveDisabled(change.status, change.interrupted)}
            onClick={() => props.onArchive(change.id)}
            data-testid={`archive-${change.issueKey}`}
          >
            Archive
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
