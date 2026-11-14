import { Box, Chip, Link, Paper, Stack, Typography } from "@mui/material";
import type { Issue } from "@flightdeck/shared";
import { GatedButton } from "../preflight/index.ts";

export function IssueList(props: {
  issues: Issue[];
  busy?: string;
  onShape: (issue: Issue) => void;
  onStart: (issue: Issue) => void;
}) {
  return (
    <Stack spacing={2}>
      {props.issues.map((issue) => (
        <Paper key={issue.id} sx={{ p: 3, border: 1, borderColor: "divider" }} data-testid="issue-row">
          <Stack direction={{ xs: "column", md: "row" }} gap={2} alignItems={{ md: "center" }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.75 }}>
                <Chip size="small" color={issue.source === "jira" ? "warning" : "info"} label={issue.source === "jira" ? "Jira" : "GitHub"} />
                {issue.saved ? <Chip size="small" variant="outlined" label="Saved" /> : <Chip size="small" variant="outlined" label="Draft" />}
                <Typography variant="caption" color="text.secondary">
                  {issue.key}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Updated {formatWhen(issue.updatedAt)}
                </Typography>
              </Stack>
              <Typography variant="h6">{issue.title}</Typography>
              {issue.url ? (
                <Link href={issue.url} target="_blank" rel="noreferrer" underline="hover" variant="body2">
                  Open on {issue.source === "jira" ? "Jira" : "GitHub"}
                </Link>
              ) : null}
            </Box>
            <Stack direction="row" gap={1}>
              <GatedButton
                gate="shape"
                variant="outlined"
                placement="top"
                disabled={props.busy === issue.id}
                onClick={() => props.onShape(issue)}
                testId={`shape-${issue.key}`}
              >
                Shape
              </GatedButton>
              <GatedButton
                gate="start"
                variant="contained"
                placement="top"
                disabled={props.busy === issue.id}
                onClick={() => props.onStart(issue)}
                testId={`start-${issue.key}`}
              >
                Start
              </GatedButton>
            </Stack>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
