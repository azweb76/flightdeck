import { useState } from "react";
import { Alert, Box, Button, CircularProgress, Grid, MenuItem, Paper, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/index.ts";
import { ColoredDiff } from "./ColoredDiff.tsx";
import { Transcript } from "./Transcript.tsx";
import { RunActions } from "./RunActions.tsx";
import { useRun } from "./useRun.ts";

export function RunView() {
  const { id } = useParams();
  const { run, setRun, error, events, diff, reviewNotes, setReviewNotes, findings } = useRun(id);
  const [tab, setTab] = useState<"transcript" | "diff" | "plan" | "review">("transcript");
  const [msg, setMsg] = useState("");
  const [target, setTarget] = useState<"current" | "next" | "run">("current");
  const [answer, setAnswer] = useState("");

  if (error) return <Alert severity="error" sx={{ m: 4 }}>{error}</Alert>;
  if (!run) {
    return (
      <Box sx={{ p: 4 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }
  return (
    <Box sx={{ p: 4, display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <Typography color="text.secondary">
        <Link to="/runs">Runs</Link> / {run.issueKey}
      </Typography>
      <Typography variant="h2">
        Run {run.issueKey} on {run.repoSlug}
      </Typography>
      <RunActions run={run} onRun={setRun} onReview={setReviewNotes} answer={answer} setAnswer={setAnswer} />
      <Grid container spacing={3} sx={{ flex: 1, minHeight: 0 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Tabs value={tab} onChange={(_, t) => setTab(t)} sx={{ mb: 2 }}>
            <Tab value="transcript" label="Transcript" />
            <Tab value="diff" label="Diff" />
            <Tab value="plan" label="Plan" />
            <Tab value="review" label="Review" />
          </Tabs>
          {tab === "transcript" ? <Transcript events={events} /> : null}
          {tab === "diff" ? <ColoredDiff diff={diff} /> : null}
          {tab === "plan" ? (
            <Box component="pre" sx={{ whiteSpace: "pre-wrap" }}>
              {events.find((e) => e.role === "planner")?.detail ?? "No plan yet."}
            </Box>
          ) : null}
          {tab === "review" ? <ReviewPane findings={findings} notes={reviewNotes} /> : null}
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 600, mb: 2 }}>Ask the agent</Typography>
            <Stack spacing={2}>
              <TextField
                select
                size="small"
                value={target}
                onChange={(e) => setTarget(e.target.value as typeof target)}
                label="Target"
              >
                <MenuItem value="current">Current phase</MenuItem>
                <MenuItem value="next">Next phase</MenuItem>
                <MenuItem value="run">Whole run</MenuItem>
              </TextField>
              <TextField
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Message the agent mid-run…"
                multiline
                minRows={4}
              />
              <Button variant="contained" onClick={() => void api.messageRun(run.id, msg, target).then(() => setMsg(""))}>
                Send
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

function ReviewPane({
  findings,
  notes,
}: {
  findings: { title: string; detail: string; excerpt?: string }[];
  notes: string;
}) {
  return (
    <Box>
      {findings.map((f) => (
        <Box key={f.title} sx={{ mb: 2 }}>
          <Typography sx={{ fontWeight: 600 }}>{f.title}</Typography>
          <Typography>{f.detail}</Typography>
          {f.excerpt ? (
            <Box component="pre" sx={{ fontSize: 12 }}>
              {f.excerpt}
            </Box>
          ) : null}
        </Box>
      ))}
      <Box component="pre" sx={{ whiteSpace: "pre-wrap" }}>
        {notes || "Press Review session to score this run."}
      </Box>
    </Box>
  );
}
