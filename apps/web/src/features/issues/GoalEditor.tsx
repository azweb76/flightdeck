import { useEffect, useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { api } from "../api/index.ts";
import { MarkdownEditor } from "../../ui/components/markdown/index.ts";
import { RefineQuestions } from "./RefineQuestions.tsx";

export function GoalEditor({
  issueId,
  fallback,
  offline,
}: {
  issueId: string;
  fallback: string;
  offline?: boolean;
}) {
  const [markdown, setMarkdown] = useState(fallback);
  const [status, setStatus] = useState<string>();
  const [questions, setQuestions] = useState<{ id: string; prompt: string; options: { id: string; label: string }[] }[]>(
    [],
  );

  useEffect(() => {
    void api.goal(issueId).then((r) => {
      if (r.goal) setMarkdown(r.goal.markdown);
      setQuestions(r.questions);
      setStatus(r.goal?.status);
    });
  }, [issueId]);

  return (
    <Box>
      {questions.length ? (
        <RefineQuestions
          issueId={issueId}
          questions={questions}
          onDone={() =>
            void api.goal(issueId).then((r) => {
              if (r.goal) setMarkdown(r.goal.markdown);
              setQuestions([]);
              setStatus(r.goal?.status);
            })
          }
        />
      ) : null}
      <MarkdownEditor id={`goal-${issueId}`} value={markdown} onChange={setMarkdown} />
      <Stack direction="row" spacing={2} sx={{ mt: 3, alignItems: "center" }}>
        <Button onClick={() => void api.saveGoal(issueId, markdown)}>Save draft</Button>
        <Button
          variant="contained"
          disabled={offline}
          onClick={() => void api.approveGoal(issueId).then((g) => setStatus(g.status))}
        >
          Approve and write back
        </Button>
        {status ? <Typography color="text.secondary">{status}</Typography> : null}
      </Stack>
    </Box>
  );
}
