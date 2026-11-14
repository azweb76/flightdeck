import { Button, Divider, Paper, Stack, Typography } from "@mui/material";
import { CheckRow } from "./CheckRow.tsx";
import { usePreflight } from "./PreflightContext.tsx";

export function PreflightSection() {
  const { report, recheck } = usePreflight();
  return (
    <Paper sx={{ p: 4, border: 1, borderColor: "divider" }} data-testid="preflight-section">
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2} sx={{ mb: 1 }}>
        <div>
          <Typography variant="h6">Dependencies</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Preflight checks for Node, pnpm, git, GitHub CLI, Claude, Jira, and the local database.
          </Typography>
        </div>
        <Button variant="outlined" onClick={() => void recheck()} data-testid="preflight-recheck">
          Re-check
        </Button>
      </Stack>
      {(report?.checks ?? []).map((check, i) => (
        <div key={check.id}>
          {i > 0 ? <Divider /> : null}
          <CheckRow check={check} />
        </div>
      ))}
    </Paper>
  );
}
