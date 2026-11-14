import { Box, Chip, Stack, Typography } from "@mui/material";
import type { PreflightCheck } from "@flightdeck/shared";
import { CopyFix } from "./CopyFix.tsx";
import { chipTone, statusLabel } from "./statusColor.ts";

export function CheckRow(props: { check: PreflightCheck }) {
  const { check } = props;
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      gap={1.5}
      alignItems={{ sm: "flex-start" }}
      sx={{ py: 1.5 }}
      data-testid={`preflight-${check.id}`}
    >
      <Chip
        size="small"
        label={statusLabel(check.status)}
        sx={{
          minWidth: 64,
          mt: 0.4,
          fontWeight: 700,
          ...chipTone(check.status),
        }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2">{check.label}</Typography>
        <Typography variant="body2" color="text.secondary">
          {check.detail}
        </Typography>
        {check.fix && !check.ok ? (
          <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: 0.5 }}>
            <Typography
              component="code"
              data-testid={`preflight-fix-${check.id}`}
              sx={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: "0.8rem",
                bgcolor: "action.hover",
                px: 1,
                py: 0.25,
                borderRadius: 1,
              }}
            >
              {check.fix}
            </Typography>
            <CopyFix command={check.fix} testId={`preflight-copy-${check.id}`} />
          </Stack>
        ) : null}
      </Box>
    </Stack>
  );
}
