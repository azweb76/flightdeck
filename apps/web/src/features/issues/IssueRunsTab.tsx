import { useEffect, useState } from "react";
import { Box, Label, Text } from "@primer/react";
import type { Run } from "@flightdeck/shared";
import { Link } from "react-router-dom";
import { api } from "../api/index.ts";

export function IssueRunsTab({ issueId }: { issueId: string }) {
  const [runs, setRuns] = useState<Run[]>([]);
  useEffect(() => {
    void api.runs().then((r) => setRuns(r.runs.filter((x) => x.issueId === issueId)));
  }, [issueId]);
  if (!runs.length) return <Text sx={{ color: "fg.muted" }}>No runs yet.</Text>;
  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      {runs.map((run) => (
        <Box key={run.id} sx={{ border: "1px solid", borderColor: "border.default", p: 3, borderRadius: 2 }}>
          <Link to={`/runs/${run.id}`}>
            Run {run.id} · {run.repoSlug} · {run.phase}
          </Link>
          <Text sx={{ display: "block", color: "fg.muted", fontSize: 1 }}>{run.status}</Text>
          {run.prUrl ? (
            <Label variant="success">
              <a href={run.prUrl}>{run.prUrl}</a>
            </Label>
          ) : null}
        </Box>
      ))}
    </Box>
  );
}
