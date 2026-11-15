import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import type { OwnPr } from "@flightdeck/shared";
import { useNavigate } from "react-router-dom";
import { ciColor, ciLabel, reviewLabel } from "./prChips.ts";

export function PrRow(props: { pr: OwnPr }) {
  const { pr } = props;
  const nav = useNavigate();
  const [owner, name] = pr.repoSlug.split("/");
  return (
    <Paper
      sx={{ px: 2, py: 1.5, border: 1, borderColor: pr.needsYou ? "warning.light" : "divider", cursor: "pointer" }}
      data-testid="pr-row"
      onClick={() => nav(`/prs/${owner}/${name}/${pr.number}`)}
    >
      <Stack direction={{ xs: "column", md: "row" }} gap={1.5} alignItems={{ md: "center" }}>
        <Stack direction="row" gap={0.75} flexWrap="wrap">
          <Chip size="small" label={ciLabel(pr.ci)} color={ciColor(pr.ci)} data-testid={`pr-ci-${pr.number}`} />
          <Chip size="small" label={reviewLabel(pr.review)} variant="outlined" data-testid={`pr-review-${pr.number}`} />
          <Chip size="small" label={pr.draft ? "Draft" : "Ready"} variant="outlined" data-testid={`pr-draft-${pr.number}`} />
          {pr.needsYou ? (
            <Chip size="small" color="warning" label="Needs you" data-testid={`pr-needs-${pr.number}`} sx={{ fontWeight: 600 }} />
          ) : null}
        </Stack>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap>
            {pr.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {pr.repoSlug}#{pr.number}
            {pr.ciRound > 0 ? ` · CI attempt ${pr.ciRound}` : ""}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}
