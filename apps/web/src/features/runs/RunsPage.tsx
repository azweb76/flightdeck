import { Alert, Box, Paper, Stack, Typography } from "@mui/material";
import type { Change } from "@flightdeck/shared";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api.ts";
import { useAppEvents } from "../../useAppEvents.ts";
import { RunRow } from "./RunRow.tsx";

export function RunsPage() {
  const [changes, setChanges] = useState<Change[]>([]);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const pull = useCallback(async () => {
    try {
      setChanges((await api.changes()).changes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load runs");
    }
  }, []);

  useEffect(() => {
    void pull();
  }, [pull]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useAppEvents(
    useCallback(
      (ev) => {
        if (ev.type === "change.updated") void pull();
      },
      [pull],
    ),
  );

  async function archive(id: string) {
    setError("");
    try {
      await api.archiveChange(id);
      await pull();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not archive");
    }
  }

  async function resume(id: string) {
    setError("");
    try {
      await api.resumeChange(id);
      await pull();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not resume");
    }
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">Runs</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Each change has its own worktree. Waiting on you keeps a slot. Archive removes the worktree.
        </Typography>
      </Box>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {changes.length === 0 ? (
        <Paper sx={{ p: 8, textAlign: "center", border: 1, borderColor: "divider" }} data-testid="empty-runs">
          <Typography variant="h6" gutterBottom>
            No runs yet
          </Typography>
          <Typography color="text.secondary">Click Start on a refined issue to run a change.</Typography>
        </Paper>
      ) : (
        <Stack spacing={1} data-testid="run-list">
          {changes.map((change) => (
            <RunRow key={change.id} change={change} now={now} onArchive={(id) => void archive(id)} onResume={(id) => void resume(id)} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
