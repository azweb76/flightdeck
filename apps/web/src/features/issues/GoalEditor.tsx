import { useEffect, useState } from "react";
import { Box, Button, Text } from "@primer/react";
import Markdown from "react-markdown";
import { api } from "../api/index.ts";
import { RefineQuestions } from "./RefineQuestions.tsx";

export function GoalEditor({ issueId, fallback }: { issueId: string; fallback: string }) {
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
      {questions.length ? <RefineQuestions issueId={issueId} questions={questions} onDone={() => void api.goal(issueId).then((r) => {
        if (r.goal) setMarkdown(r.goal.markdown);
        setQuestions([]);
        setStatus(r.goal?.status);
      })} /> : null}
      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        <Box sx={{ flex: 1, minWidth: 280 }}>
          <Text sx={{ fontSize: 0, color: "fg.muted" }}>Markdown</Text>
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            style={{ width: "100%", minHeight: 280, fontFamily: "ui-monospace, monospace", fontSize: 13 }}
          />
        </Box>
        <Box sx={{ flex: 1, minWidth: 280, border: "1px solid", borderColor: "border.default", p: 3, borderRadius: 2 }}>
          <Text sx={{ fontSize: 0, color: "fg.muted" }}>Preview</Text>
          <Markdown>{markdown || fallback || "_No description_"}</Markdown>
        </Box>
      </Box>
      <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
        <Button onClick={() => void api.saveGoal(issueId, markdown)}>Save draft</Button>
        <Button variant="primary" onClick={() => void api.approveGoal(issueId).then((g) => setStatus(g.status))}>
          Approve and write back
        </Button>
        {status ? <Text sx={{ color: "fg.muted", alignSelf: "center" }}>{status}</Text> : null}
      </Box>
    </Box>
  );
}
