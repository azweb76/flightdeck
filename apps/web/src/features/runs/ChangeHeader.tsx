import { Box, Button, Chip, Link, Stack, Typography } from "@mui/material";
import type { Change } from "@flightdeck/shared";
import { archiveDisabled, chipColor, chipSx, statusChip } from "./changeStatus.ts";

export function ChangeHeader(props: { change: Change; onRuns: () => void; onArchive: () => void; onResume: () => void }) {
  const { change } = props;
  return (
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2}>
      <Box>
        <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
          <Typography variant="h4">{change.title}</Typography>
          <Chip
            size="small"
            color={chipColor(change.status, change.interrupted, change.ciPhase)}
            label={statusChip(change.status, change.interrupted, change.ask?.reason, change.ciPhase)}
            data-testid="change-status"
            sx={chipSx(change.status, change.interrupted, change.ciPhase)}
          />
        </Stack>
        <Typography color="text.secondary" sx={{ mt: 0.5 }} data-testid="change-cost">
          {change.issueKey} · {change.repoSlug} · ${change.costUsd.toFixed(2)} · {change.branch || "no branch yet"}
        </Typography>
        {change.prUrl ? (
          <Link href={change.prUrl} target="_blank" rel="noreferrer" data-testid="pr-link">
            {change.prUrl}
          </Link>
        ) : null}
      </Box>
      <Stack direction="row" gap={1}>
        <Button variant="outlined" onClick={props.onRuns}>
          All runs
        </Button>
        {change.interrupted ? (
          <Button variant="contained" onClick={props.onResume} data-testid="resume-change">
            Resume
          </Button>
        ) : null}
        <Button
          variant="outlined"
          disabled={archiveDisabled(change.status, change.interrupted)}
          onClick={props.onArchive}
          data-testid="archive-change"
        >
          Archive
        </Button>
      </Stack>
    </Stack>
  );
}
