import { Box, Chip, Stack, Typography } from "@mui/material";
import type { Issue } from "@flightdeck/shared";
import { Link } from "react-router-dom";
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
        p: 3,
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
      <Typography sx={{ mt: 1, fontWeight: 600 }}>{issue.title}</Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}>
        <Chip size="small" label={issue.source} color={issue.source === "jira" ? "primary" : "success"} />
        {issue.repos.map((r) => (
          <Chip key={`${r.owner}/${r.name}`} size="small" label={r.label ?? `${r.owner}/${r.name}`} variant="outlined" />
        ))}
      </Stack>
      {issue.statusNote ? (
        <Typography sx={{ mt: 2, fontSize: 12 }}>{issue.statusNote}</Typography>
      ) : null}
      {warning ? (
        <Typography sx={{ mt: 2, fontSize: 12, color: "warning.main" }}>
          {warning}
          {unregistered.length ? ` · unknown: ${unregistered.map((r) => `${r.owner}/${r.name}`).join(", ")}` : ""}
        </Typography>
      ) : null}
    </Box>
  );
}
