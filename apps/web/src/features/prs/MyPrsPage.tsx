import { Alert, Box, Paper, Stack, Tab, Tabs, Typography } from "@mui/material";
import type { OwnPr, PrFilter } from "@flightdeck/shared";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api.ts";
import { PrRow } from "./PrRow.tsx";

const FILTERS: { id: PrFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "needs_you", label: "Needs you" },
  { id: "failing", label: "Failing CI" },
  { id: "draft", label: "Draft" },
  { id: "ready", label: "Ready" },
];

export function MyPrsPage() {
  const [filter, setFilter] = useState<PrFilter>("all");
  const [prs, setPrs] = useState<OwnPr[]>([]);
  const [error, setError] = useState("");

  const pull = useCallback(async (next: PrFilter) => {
    try {
      setPrs((await api.myPrs(next)).prs);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load pull requests");
    }
  }, []);

  useEffect(() => {
    void pull(filter);
  }, [filter, pull]);

  return (
    <Stack spacing={3} data-testid="my-prs">
      <Box>
        <Typography variant="h4">My PRs</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Your open pull requests. Reviews of other people’s PRs live on Reviews.
        </Typography>
      </Box>
      <Tabs value={filter} onChange={(_, v) => setFilter(v as PrFilter)} data-testid="pr-filters">
        {FILTERS.map((f) => (
          <Tab key={f.id} value={f.id} label={f.label} data-testid={`pr-filter-${f.id}`} />
        ))}
      </Tabs>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {prs.length === 0 ? (
        <Paper sx={{ p: 8, textAlign: "center", border: 1, borderColor: "divider" }} data-testid="empty-prs">
          <Typography variant="h6" gutterBottom>
            No pull requests
          </Typography>
          <Typography color="text.secondary">Open a draft PR from a change, or pick another filter.</Typography>
        </Paper>
      ) : (
        <Stack spacing={1} data-testid="pr-list">
          {prs.map((pr) => (
            <PrRow key={pr.id} pr={pr} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
