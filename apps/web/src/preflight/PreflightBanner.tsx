import { Alert, Button, Divider, Paper, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { CheckRow } from "./CheckRow.tsx";
import { usePreflight } from "./PreflightContext.tsx";

export function PreflightBanner() {
  const { report, recheck } = usePreflight();
  if (!report || report.ok) return null;
  const failed = report.checks.filter((c) => c.severity === "required" && !c.ok);
  if (failed.length === 0) return null;

  return (
    <Paper
      data-testid="preflight-banner"
      sx={{ p: 3, border: 1, borderColor: "error.light", bgcolor: "background.paper" }}
    >
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2} sx={{ mb: 1 }}>
        <Typography variant="h6">Fix these before shaping</Typography>
        <Button variant="outlined" onClick={() => void recheck()} data-testid="preflight-recheck">
          Re-check
        </Button>
      </Stack>
      <Alert
        severity="error"
        variant="outlined"
        sx={{
          mb: 2,
          bgcolor: "error.main",
          color: "#fff",
          borderColor: "error.main",
          "& .MuiAlert-icon": { color: "#fff" },
        }}
      >
        Flightdeck can still run, but Shape and GitHub save stay off until the required tools are ready.
      </Alert>
      {failed.map((check, i) => (
        <BoxBlock key={check.id} divider={i > 0}>
          <CheckRow check={check} />
        </BoxBlock>
      ))}
    </Paper>
  );
}

function BoxBlock(props: { divider: boolean; children: ReactNode }) {
  return (
    <>
      {props.divider ? <Divider /> : null}
      {props.children}
    </>
  );
}
