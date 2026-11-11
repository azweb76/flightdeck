import { Box, Button, Label, Text, TextInput } from "@primer/react";
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
      <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap", my: 2 }}>
        <Label>{run.phase}</Label>
        <Label>
          Round {run.round} of {run.maxRounds}
        </Label>
        <Text sx={{ color: "fg.muted" }}>
          ${run.costUsd.toFixed(2)} of ${run.capUsd.toFixed(2)} cap
        </Text>
        <Button onClick={() => void api.cancelRun(run.id).then(onRun)}>Stop</Button>
        {run.status === "paused" || run.status === "asking" ? (
          <Button onClick={() => void api.resumeRun(run.id).then(onRun)}>Resume</Button>
        ) : null}
        <Button onClick={() => void api.fixRun(run.id).then(onRun)}>Fix</Button>
        {run.status === "completed" ? (
          <Button
            onClick={() =>
              void api.sessionReview(run.id).then((s) => onReview(String((s.score as { notes?: string }).notes ?? "")))
            }
          >
            Review session
          </Button>
        ) : null}
      </Box>
      {run.pauseReason ? (
        <Box sx={{ bg: "attention.subtle", p: 3, borderRadius: 2, mb: 3 }}>
          <Text sx={{ fontWeight: 600 }}>Needs you</Text>
          <Text sx={{ display: "block" }}>{run.pauseReason}</Text>
          <TextInput value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Answer" sx={{ mt: 2 }} />
          <Button sx={{ mt: 2 }} onClick={() => void api.answerRun(run.id, answer).then(onRun)}>
            Send answer
          </Button>
        </Box>
      ) : null}
    </>
  );
}
