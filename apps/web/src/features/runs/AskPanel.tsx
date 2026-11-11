import { Box, Button, Chip, Stack, TextField, Typography } from "@mui/material";
import type { Question, Run } from "@flightdeck/shared";
import { api } from "../api/index.ts";

export function AskPanel({
  run,
  question,
  answer,
  setAnswer,
  onRun,
}: {
  run: Run;
  question?: Question | null;
  answer: string;
  setAnswer: (s: string) => void;
  onRun: (r: Run) => void;
}) {
  if (!run.pauseReason && !question) return null;
  const prompt = question?.prompt ?? run.pauseReason ?? "";
  const options = question?.options ?? [];

  async function send(text = answer) {
    const next = text.trim();
    if (!next) return;
    onRun(await api.answerRun(run.id, next));
    setAnswer("");
  }

  return (
    <Box sx={{ mb: 2, p: 2, border: "1px solid", borderColor: "warning.main", borderRadius: 1, bgcolor: "background.paper" }}>
      <Typography sx={{ fontWeight: 600, mb: 1 }}>Needs you</Typography>
      <Typography sx={{ mb: 1 }}>{prompt}</Typography>
      {options.length ? (
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1, mb: 1 }}>
          {options.map((o) => (
            <Chip key={o.id} label={o.label} size="small" onClick={() => void send(o.label)} />
          ))}
        </Stack>
      ) : null}
      <TextField
        size="small"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            void send();
          }
        }}
        placeholder="Answer · ⌘ Enter to send"
        multiline
        minRows={2}
        fullWidth
      />
      <Button sx={{ mt: 1 }} size="small" variant="contained" onClick={() => void send()} disabled={!answer.trim()}>
        Send
      </Button>
    </Box>
  );
}
