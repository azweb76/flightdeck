import { Box, Stack, Typography } from "@mui/material";
import type { Issue, IssueStage } from "@flightdeck/shared";
import { IssueCard } from "./IssueCard.tsx";

const TITLES: Record<IssueStage, string> = {
  new: "New",
  refined: "Refined",
  running: "Running",
  pr_open: "PR Open",
};

export function BoardColumn({ stage, issues }: { stage: IssueStage; issues: Issue[] }) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 220,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        p: 2,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", px: 1, mb: 2 }}>
        <Typography sx={{ fontWeight: 600 }}>{TITLES[stage]}</Typography>
        <Typography color="text.secondary">{issues.length}</Typography>
      </Box>
      <Stack spacing={2}>
        {issues.map((issue) => (
          <IssueCard key={issue.id} issue={issue} />
        ))}
        {issues.length === 0 ? (
          <Typography color="text.secondary" sx={{ px: 1 }}>
            No {TITLES[stage].toLowerCase()} issues
          </Typography>
        ) : null}
      </Stack>
    </Box>
  );
}
