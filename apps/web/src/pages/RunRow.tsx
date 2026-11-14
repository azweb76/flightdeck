import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import type { Change } from "@flightdeck/shared";
import { Link as RouterLink } from "react-router-dom";
import { archiveDisabled, askingChipSx, chipColor, statusChip } from "./changeStatus.ts";

export function RunRow(props: { change: Change; onArchive: (id: string) => void }) {
  const { change } = props;
  return (
    <Paper sx={{ p: 3, border: 1, borderColor: "divider" }} data-testid="run-row">
      <Stack direction={{ xs: "column", md: "row" }} gap={2} alignItems={{ md: "center" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.75 }}>
            <Chip
              size="small"
              color={chipColor(change.status)}
              label={statusChip(change.status)}
              data-testid={`run-status-${change.issueKey}`}
              sx={change.status === "asking" ? askingChipSx : undefined}
            />
            <Typography variant="caption" color="text.secondary">
              {change.issueKey}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ${change.costUsd.toFixed(2)}
            </Typography>
          </Stack>
          <Typography variant="h6">{change.title}</Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <Button component={RouterLink} to={`/runs/${change.id}`} variant="contained" data-testid={`open-run-${change.issueKey}`}>
            Open
          </Button>
          <Button
            variant="outlined"
            disabled={archiveDisabled(change.status)}
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
