import { Box, Chip, Stack, Typography } from "@mui/material";
import type { Issue } from "@flightdeck/shared";
import { Link } from "react-router-dom";
import { repoChipLabel } from "./repoDisplay.ts";
import { issueWarningText } from "./warning.ts";

/** Canonical React component: an issue card on the board. */
export function IssueCard({ issue }: { issue: Issue }) {
  const warning = issueWarningText(issue);
  const unregistered = issue.repos.filter((r) => !r.registered);
  return (
    <Box
      component={Link}
      to={`/issues/${encodeURIComponent(issue.id)}`}
      sx={{
        display: "block",
        p: 2,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: issue.needsYou || warning ? "warning.main" : "divider",
        borderWidth: issue.needsYou ? 2 : 1,
        borderRadius: 1,
        textDecoration: "none",
        color: "text.primary",
        "&:hover": { borderColor: "primary.main" },
      }}
    >
      <Typography sx={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "text.secondary" }}>
        {issue.key}
      </Typography>
      <Typography sx={{ mt: 0.5, fontWeight: 600 }}>{issue.title}</Typography>
      <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: "wrap", gap: 0.5 }}>
        <Chip
          size="small"
          label={issue.source}
          color={issue.source === "jira" ? "primary" : "success"}
          sx={{ height: 18, "& .MuiChip-label": { px: 0.75 } }}
        />
        {issue.repos.map((r) => (
          <Chip key={`${r.owner}/${r.name}`} size="small" label={repoChipLabel(r)} variant="outlined" />
        ))}
      </Stack>
      {issue.statusNote ? (
        <Typography sx={{ mt: 1, fontSize: 12, color: "text.secondary" }}>{issue.statusNote}</Typography>
      ) : null}
      {warning ? (
        <Typography sx={{ mt: 1, fontSize: 12, color: "warning.main" }}>
          {warning}
          {unregistered.length ? ` · unknown: ${unregistered.map((r) => `${r.owner}/${r.name}`).join(", ")}` : ""}
        </Typography>
      ) : null}
    </Box>
  );
}
