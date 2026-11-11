import { useEffect, useState } from "react";
import { Box, Heading, Label, Text } from "@primer/react";
import type { Run } from "@flightdeck/shared";
import { Link } from "react-router-dom";
import { api } from "../api/index.ts";

export function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  useEffect(() => {
    void api.runs().then((r) => setRuns(r.runs));
  }, []);
  return (
    <Box sx={{ p: [3, 4] }}>
      <Heading as="h2">Runs</Heading>
      {runs.length === 0 ? <Text sx={{ color: "fg.muted" }}>No runs yet. Start one from an issue.</Text> : null}
      <Box sx={{ display: "grid", gap: 2, mt: 3 }}>
        {runs.map((run) => (
          <Box key={run.id} sx={{ border: "1px solid", borderColor: run.status === "asking" ? "attention.emphasis" : "border.default", p: 3, borderRadius: 2 }}>
            <Link to={`/runs/${run.id}`}>
              {run.issueKey} on {run.repoSlug}
            </Link>
            <Text sx={{ display: "block", fontSize: 1, color: "fg.muted" }}>
              {run.phase} · round {run.round}/{run.maxRounds} · ${run.costUsd.toFixed(2)} of ${run.capUsd.toFixed(2)}
            </Text>
            <Label>{run.status}</Label>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
