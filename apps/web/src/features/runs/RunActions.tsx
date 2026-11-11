import { Box, Button, ButtonGroup, Chip, Stack, TextField, Typography } from "@mui/material";
import type { Run } from "@flightdeck/shared";
import { api } from "../api/index.ts";

export function RunActions({
  run,
  onRun,
  onReview,
  answer,
  setAnswer,
}: {
  run: Run;
  onRun: (r: Run) => void;
  onReview: (notes: string) => void;
  answer: string;
  setAnswer: (s: string) => void;
}) {
  const live = run.status === "queued" || run.status === "running" || run.status === "paused" || run.status === "asking";
  return (
    <>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", my: 2, gap: 1 }}>
        <Chip size="small" color={live ? "info" : "default"} label={run.phase} />
        <Chip size="small" variant="outlined" label={`Round ${run.round} of ${run.maxRounds}`} />
        <Typography color="text.secondary">
          ${run.costUsd.toFixed(2)} of ${run.capUsd.toFixed(2)} cap
        </Typography>
        <ButtonGroup size="small" variant="outlined">
          <Button onClick={() => void api.cancelRun(run.id).then(onRun)}>Stop</Button>
          {run.status === "paused" || run.status === "asking" ? (
            <Button onClick={() => void api.resumeRun(run.id).then(onRun)}>Resume</Button>
          ) : null}
          <Button onClick={() => void api.fixRun(run.id).then(onRun)}>Fix</Button>
        </ButtonGroup>
        {run.status === "completed" ? (
          <Button
            size="small"
            onClick={() =>
              void api.sessionReview(run.id).then((s) => onReview(String((s.score as { notes?: string }).notes ?? "")))
            }
          >
            Review session
          </Button>
        ) : null}
      </Stack>
      {run.pauseReason ? (
        <Box sx={{ mb: 3, p: 2, border: "1px solid", borderColor: "divider", borderRadius: 1, bgcolor: "background.paper" }}>
          <Typography sx={{ fontWeight: 600 }}>Needs you</Typography>
          <Typography color="text.secondary">{run.pauseReason}</Typography>
          <TextField
            size="small"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Answer"
            sx={{ mt: 2 }}
            fullWidth
          />
          <Button sx={{ mt: 2 }} variant="contained" onClick={() => void api.answerRun(run.id, answer).then(onRun)}>
            Send answer
          </Button>
        </Box>
      ) : null}
    </>
  );
}
