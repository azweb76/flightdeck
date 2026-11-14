import { Box, Button, Paper, Typography } from "@mui/material";
import { githubCardTitle, type CatalogRepo } from "@flightdeck/shared";
import type { AppStatus } from "../api.ts";

export function StatusCards(props: {
  status: AppStatus;
  repos: CatalogRepo[];
  onClaudeHint: () => void;
}) {
  const { claude, github, jira } = props.status;
  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
      <Paper sx={{ p: 3, border: 1, borderColor: "divider" }} data-testid="claude-status">
        <Typography variant="overline" color="text.secondary">
          Claude
        </Typography>
        <Typography variant="h6">{claude.found ? "Ready" : "Needs login"}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1, whiteSpace: "pre-wrap" }}>
          {claude.detail}
        </Typography>
        {!claude.found ? (
          <Button variant="outlined" sx={{ mt: 2 }} onClick={props.onClaudeHint} data-testid="claude-login">
            How to log in
          </Button>
        ) : null}
      </Paper>
      <Paper sx={{ p: 3, border: 1, borderColor: "divider" }} data-testid="github-status">
        <Typography variant="overline" color="text.secondary">
          GitHub
        </Typography>
        <Typography variant="h6">{githubCardTitle(github)}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {github.detail}
        </Typography>
      </Paper>
      <Paper sx={{ p: 3, border: 1, borderColor: "divider" }} data-testid="jira-status">
        <Typography variant="overline" color="text.secondary">
          Jira
        </Typography>
        <Typography variant="h6">{jira.configured ? "Connected" : "Not connected"}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {jira.detail}
        </Typography>
      </Paper>
      <Paper sx={{ p: 3, border: 1, borderColor: "divider" }} data-testid="repos-list">
        <Typography variant="overline" color="text.secondary">
          Repos
        </Typography>
        {props.repos.length === 0 ? (
          <Typography color="text.secondary">No repos yet. Clone one when you start shaping.</Typography>
        ) : (
          props.repos.map((r) => (
            <Typography key={`${r.owner}/${r.name}`} sx={{ mt: 1 }}>
              {r.owner}/{r.name}
            </Typography>
          ))
        )}
      </Paper>
    </Box>
  );
}
