import { Alert, Box, Button, Chip, Stack, TextField, Typography } from "@mui/material";
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
  return (
    <>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", my: 2, gap: 1 }}>
        <Chip size="small" label={run.phase} />
        <Chip size="small" variant="outlined" label={`Round ${run.round} of ${run.maxRounds}`} />
        <Typography color="text.secondary">
          ${run.costUsd.toFixed(2)} of ${run.capUsd.toFixed(2)} cap
        </Typography>
        <Button size="small" onClick={() => void api.cancelRun(run.id).then(onRun)}>
          Stop
        </Button>
        {run.status === "paused" || run.status === "asking" ? (
          <Button size="small" onClick={() => void api.resumeRun(run.id).then(onRun)}>
            Resume
          </Button>
        ) : null}
        <Button size="small" onClick={() => void api.fixRun(run.id).then(onRun)}>
          Fix
        </Button>
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
        <Alert severity="info" sx={{ mb: 3, bgcolor: "background.paper" }}>
          <Typography sx={{ fontWeight: 600 }}>Needs you</Typography>
          <Typography>{run.pauseReason}</Typography>
          <TextField
            size="small"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Answer"
            sx={{ mt: 2, display: "block" }}
            fullWidth
          />
          <Button sx={{ mt: 2 }} variant="contained" onClick={() => void api.answerRun(run.id, answer).then(onRun)}>
            Send answer
          </Button>
        </Alert>
      ) : null}
      <Box />
    </>
  );
}
