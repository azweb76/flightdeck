import { Box, Button, Chip, Link, Stack, Typography } from "@mui/material";
import type { Change } from "@flightdeck/shared";
import { chipColor, statusChip } from "./changeStatus.ts";

export function ChangeHeader(props: { change: Change; onRuns: () => void; onArchive: () => void }) {
  const { change } = props;
  return (
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2}>
      <Box>
        <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
          <Typography variant="h4">{change.title}</Typography>
          <Chip size="small" color={chipColor(change.status)} label={statusChip(change.status)} data-testid="change-status" />
        </Stack>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
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
        <Button
          variant="outlined"
          disabled={["planning", "implementing", "reviewing", "opening_pr"].includes(change.status)}
          onClick={props.onArchive}
          data-testid="archive-change"
        >
          Archive
        </Button>
      </Stack>
    </Stack>
  );
}
