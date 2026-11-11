import { Alert, Button, Stack } from "@mui/material";
import { api } from "../api/index.ts";

export function SpendBanner({
  spend,
  onChange,
}: {
  spend?: { todayUsd: number; capUsd: number; blocked: boolean; reason?: string };
  onChange: () => void;
}) {
  if (!spend?.blocked) return null;
  return (
    <Alert
      severity="warning"
      sx={{ mt: 2 }}
      action={
        <Stack direction="row" spacing={1}>
          <Button size="small" onClick={() => void api.raiseSpendCap(Math.ceil((spend.capUsd || 50) * 2)).then(onChange)}>
            Raise cap
          </Button>
          <Button size="small" onClick={() => void api.resumeSpendTomorrow().then(onChange)}>
            Resume tomorrow
          </Button>
        </Stack>
      }
    >
      {spend.reason}
    </Alert>
  );
}
