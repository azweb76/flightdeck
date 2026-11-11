import { useState } from "react";
import { Box, Button, FormControl, Text, TextInput } from "@primer/react";
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
    <Box sx={{ mb: 4, p: 3, border: "1px solid", borderColor: "border.default", borderRadius: 2 }}>
      <Text as="h3" sx={{ fontSize: 2, fontWeight: 600, display: "block", mb: 3 }}>
        Clarifying questions
      </Text>
      {questions.map((q) => (
        <Box key={q.id} sx={{ mb: 3 }}>
          <Text sx={{ fontWeight: 600, display: "block", mb: 2 }}>{q.prompt}</Text>
          {q.options.map((o) => (
            <FormControl key={o.id} sx={{ mb: 1 }}>
              <FormControl.Label>
                <input
                  type="radio"
                  name={q.id}
                  checked={picked[q.id] === o.id}
                  onChange={() => setPicked((p) => ({ ...p, [q.id]: o.id }))}
                />{" "}
                {o.label}
              </FormControl.Label>
            </FormControl>
          ))}
          <TextInput
            placeholder="Other"
            value={other[q.id] ?? ""}
            onChange={(e) => setOther((p) => ({ ...p, [q.id]: e.target.value }))}
          />
        </Box>
      ))}
      <Button
        variant="primary"
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
