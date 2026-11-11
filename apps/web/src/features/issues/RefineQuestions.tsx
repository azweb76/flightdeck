import { useState } from "react";
import { Box, Button, FormControl, FormControlLabel, Radio, RadioGroup, TextField, Typography } from "@mui/material";
import { api } from "../api/index.ts";

type Q = { id: string; prompt: string; options: { id: string; label: string }[] };

export function RefineQuestions({
  issueId,
  questions,
  onDone,
}: {
  issueId: string;
  questions: Q[];
  onDone: () => void;
}) {
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [other, setOther] = useState<Record<string, string>>({});

  return (
    <Box sx={{ mb: 4, p: 3, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
      <Typography variant="h3" sx={{ mb: 3 }}>
        Clarifying questions
      </Typography>
      {questions.map((q) => (
        <Box key={q.id} sx={{ mb: 3 }}>
          <Typography sx={{ fontWeight: 600, mb: 2 }}>{q.prompt}</Typography>
          <FormControl>
            <RadioGroup
              value={picked[q.id] ?? ""}
              onChange={(e) => setPicked((p) => ({ ...p, [q.id]: e.target.value }))}
            >
              {q.options.map((o) => (
                <FormControlLabel key={o.id} value={o.id} control={<Radio size="small" />} label={o.label} />
              ))}
            </RadioGroup>
          </FormControl>
          <TextField
            size="small"
            placeholder="Other"
            value={other[q.id] ?? ""}
            onChange={(e) => setOther((p) => ({ ...p, [q.id]: e.target.value }))}
            sx={{ mt: 1 }}
            fullWidth
          />
        </Box>
      ))}
      <Button
        variant="contained"
        onClick={() => {
          const answers = questions.map((q) => ({
            questionId: q.id,
            optionId: picked[q.id],
            other: other[q.id],
          }));
          void api.refineAnswers(issueId, answers).then(onDone);
        }}
      >
        Draft goal
      </Button>
    </Box>
  );
}
