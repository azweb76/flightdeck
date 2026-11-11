import { Box, Chip, Stack, Tooltip, Typography } from "@mui/material";
import { useLocation } from "react-router-dom";
import { SearchIcon } from "../ui/icons.tsx";
import { Alerts } from "./Alerts.tsx";
import type { SyncState } from "./syncStatus.ts";

export type { SyncState };

export function TopBar({
  sync,
  spend,
}: {
  sync: SyncState;
  spend?: { todayUsd: number; capUsd: number; blocked?: boolean };
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
        py: 1,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        minHeight: 40,
      }}
    >
      <Typography sx={{ color: "text.secondary", minWidth: 120 }}>{crumb}</Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", ml: "auto" }}>
        <SearchField />
        {spend ? (
          <Chip
            size="small"
            variant="outlined"
            color={spend.blocked ? "warning" : "default"}
            label={`$${spend.todayUsd.toFixed(2)} / $${spend.capUsd.toFixed(2)} today`}
          />
        ) : null}
        <Tooltip title={sync.detail}>
          <Chip size="small" label={sync.label} color={sync.tone === "default" ? "default" : sync.tone} variant="outlined" />
        </Tooltip>
        <Alerts />
      </Stack>
    </Box>
  );
}

function SearchField() {
  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => window.dispatchEvent(new Event("flightdeck:palette"))}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") window.dispatchEvent(new Event("flightdeck:palette"));
      }}
      sx={{
        width: 280,
        height: 28,
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1.5,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        bgcolor: "background.default",
        color: "text.secondary",
        cursor: "pointer",
        fontSize: 13,
      }}
    >
      <SearchIcon />
      <Box sx={{ flex: 1 }}>Search or jump to…</Box>
      <Typography sx={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "text.disabled" }}>⌘K</Typography>
    </Box>
  );
}

function crumbFor(path: string): string {
  if (path === "/") return "Next";
  if (path.startsWith("/issues/new")) return "Issues / New";
  if (path.startsWith("/issues/")) return "Issues / Detail";
  if (path.startsWith("/issues")) return "Issues";
  if (path.startsWith("/runs/")) return "Runs / Detail";
  if (path.startsWith("/prs")) return "Pull requests";
  if (path.startsWith("/runs")) return "Runs";
  if (path.startsWith("/reviews/")) return "Reviews / Diff";
  if (path.startsWith("/reviews")) return "Reviews";
  if (path.startsWith("/stats")) return "Stats";
  if (path.startsWith("/settings")) return "Settings";
  return "Flightdeck";
}
