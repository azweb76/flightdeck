import { Box, Paper, Stack, Typography } from "@mui/material";
import type { Change, ChangeStage } from "@flightdeck/shared";

const STAGES: { id: ChangeStage; label: string }[] = [
  { id: "plan", label: "Plan" },
  { id: "implement", label: "Implement" },
  { id: "review", label: "Review" },
  { id: "pr", label: "Draft PR" },
  { id: "ci", label: "CI" },
];

export function StageTimeline(props: { change: Change }) {
  return (
    <Paper sx={{ p: 3, border: 1, borderColor: "divider" }} data-testid="stage-timeline">
      <Typography variant="h6" sx={{ mb: 2 }}>
        Stages
      </Typography>
      <Stack spacing={1.5}>
        {STAGES.map((stage) => (
          <Box key={stage.id} data-testid={`stage-${stage.id}`} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                mt: 0.7,
                borderRadius: "50%",
                bgcolor: dotColor(props.change, stage.id),
                flexShrink: 0,
              }}
            />
            <Box>
              <Typography fontWeight={600}>{stage.label}</Typography>
              <Typography variant="body2" color="text.secondary">
                {caption(props.change, stage.id)}
              </Typography>
            </Box>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}

function order(stage: ChangeStage): number {
  return STAGES.findIndex((s) => s.id === stage);
}

function dotColor(change: Change, stage: ChangeStage): string {
  if (stage === "ci") return "action.disabled";
  const here = order(change.stage);
  const want = order(stage);
  if (change.status === "needs_dan" && stage === "review") return "error.main";
  if (change.status === "cap_hit" && want <= here) return "error.main";
  if (want < here) return "success.main";
  if (want === here) return "primary.main";
  return "action.disabled";
}

function caption(change: Change, stage: ChangeStage): string {
  if (stage === "review") return change.reviewRound ? `Round ${change.reviewRound} of 3` : "Waiting";
  if (stage === "pr") return change.prUrl ? "Opened" : "Opens after review";
  if (stage === "ci") return "Phase 4 placeholder";
  if (stage === "plan") {
    if (change.status === "asking") return "Paused for your answer";
    if (change.status === "cap_hit") return "Stopped on the dollar cap";
    return change.planText ? "Kept in the app only" : "Not started";
  }
  if (change.stage === stage) return statusWord(change.status);
  return order(stage) < order(change.stage) ? "Done" : "Waiting";
}

function statusWord(status: Change["status"]): string {
  if (status === "asking") return "Paused for your answer";
  if (status === "cap_hit") return "Stopped on the dollar cap";
  if (status === "needs_dan") return "Stopped after 3 review rounds";
  return "In progress";
}
