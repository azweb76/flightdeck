import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import { useLocation } from "react-router-dom";
import { Alerts } from "./Alerts.tsx";

export function TopBar({
  syncLabel,
  syncTone,
}: {
  syncLabel: string;
  syncTone: "success" | "warning" | "default";
}) {
  const loc = useLocation();
  const crumb = crumbFor(loc.pathname);
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        px: 3,
        py: 2,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        minHeight: 48,
      }}
    >
      <Typography sx={{ flex: 1, color: "text.secondary" }}>{crumb}</Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Button
          size="small"
          variant="outlined"
          onClick={() => window.dispatchEvent(new Event("flightdeck:palette"))}
        >
          Search ⌘K
        </Button>
        <Chip
          size="small"
          label={syncLabel}
          color={syncTone === "default" ? "default" : syncTone}
          variant="outlined"
        />
        <Alerts />
      </Stack>
    </Box>
  );
}

function crumbFor(path: string): string {
  if (path.startsWith("/issues/new")) return "Issues / New";
  if (path.startsWith("/issues/")) return "Issues / Detail";
  if (path.startsWith("/issues")) return "Issues";
  if (path.startsWith("/runs/")) return "Runs / Detail";
  if (path.startsWith("/runs")) return "Runs";
  if (path.startsWith("/reviews/")) return "Reviews / Diff";
  if (path.startsWith("/reviews")) return "Reviews";
  if (path.startsWith("/stats")) return "Stats";
  if (path.startsWith("/settings")) return "Settings";
  return "Flightdeck";
}
