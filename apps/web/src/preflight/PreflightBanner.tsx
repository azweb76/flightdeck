import { bannerTitle, stayOffCopy } from "@flightdeck/shared";
import { Button, Divider, Paper, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { ContrastAlert } from "../ui/ContrastAlert.tsx";
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
        <Typography variant="h6" data-testid="preflight-banner-title">
          {bannerTitle(report)}
        </Typography>
        <Button variant="outlined" onClick={() => void recheck()} data-testid="preflight-recheck">
          Re-check
        </Button>
      </Stack>
      <ContrastAlert sx={{ mb: 2 }} data-testid="preflight-stay-off">
        {stayOffCopy(report)}
      </ContrastAlert>
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
