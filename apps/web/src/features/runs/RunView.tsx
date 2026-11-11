import { useEffect, useState } from "react";
import { Box, Button, Heading, Label, Text, TextInput } from "@primer/react";
import type { Run, TranscriptEvent } from "@flightdeck/shared";
import { Link, useParams } from "react-router-dom";
import { api, subscribeEvents } from "../api/index.ts";
import { Transcript } from "./Transcript.tsx";

export function RunView() {
  const { id } = useParams();
  const [run, setRun] = useState<Run>();
  const [events, setEvents] = useState<TranscriptEvent[]>([]);
  const [tab, setTab] = useState<"transcript" | "diff" | "plan" | "review">("transcript");
  const [msg, setMsg] = useState("");
  const [target, setTarget] = useState<"current" | "next" | "run">("current");
  const [answer, setAnswer] = useState("");

  function load() {
    if (!id) return;
    void api.run(Number(id)).then((r) => {
      setRun(r.run);
      setEvents(r.events);
    });
  }
  useEffect(() => {
    load();
    return subscribeEvents(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!run) return <Box sx={{ p: 4 }}>Loading…</Box>;

  return (
    <Box sx={{ p: [3, 4], display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <Text sx={{ color: "fg.muted", fontSize: 1 }}>
        <Link to="/runs">Runs</Link> / {run.issueKey}
      </Text>
      <Heading as="h2">
        Run {run.issueKey} on {run.repoSlug}
      </Heading>
      <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap", my: 2 }}>
        <Label>{run.phase}</Label>
        <Label>Round {run.round} of {run.maxRounds}</Label>
        <Text sx={{ color: "fg.muted" }}>
          ${run.costUsd.toFixed(2)} of ${run.capUsd.toFixed(2)} cap
        </Text>
        <Button onClick={() => void api.cancelRun(run.id).then(setRun)}>Stop</Button>
        {run.status === "paused" || run.status === "asking" ? (
          <Button onClick={() => void api.resumeRun(run.id).then(setRun)}>Resume</Button>
        ) : null}
        <Button onClick={() => void api.fixRun(run.id).then(setRun)}>Fix</Button>
        {run.status === "completed" ? (
          <Button onClick={() => void api.sessionReview(run.id)}>Review session</Button>
        ) : null}
      </Box>
      {run.pauseReason ? (
        <Box sx={{ bg: "attention.subtle", p: 3, borderRadius: 2, mb: 3 }}>
          <Text sx={{ fontWeight: 600 }}>Needs you</Text>
          <Text sx={{ display: "block" }}>{run.pauseReason}</Text>
          <TextInput value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Answer" sx={{ mt: 2 }} />
          <Button sx={{ mt: 2 }} onClick={() => void api.answerRun(run.id, answer).then(setRun)}>
            Send answer
          </Button>
        </Box>
      ) : null}
      <Box sx={{ display: "flex", gap: 3, mb: 3 }}>
        {(["transcript", "diff", "plan", "review"] as const).map((t) => (
          <Box as="button" key={t} onClick={() => setTab(t)} sx={{ appearance: "none", bg: "transparent", border: 0, fontWeight: tab === t ? 600 : 400, cursor: "pointer" }}>
            {t}
          </Box>
        ))}
      </Box>
      <Box sx={{ flex: 1 }}>
        {tab === "transcript" ? <Transcript events={events} /> : null}
        {tab === "diff" ? <Text sx={{ color: "fg.muted" }}>{run.prUrl ?? "Diff appears after the PR opens."}</Text> : null}
        {tab === "plan" ? <Text as="pre">{events.find((e) => e.role === "planner")?.detail ?? "No plan yet."}</Text> : null}
        {tab === "review" ? <Text sx={{ color: "fg.muted" }}>Session review findings land here after you press Review session.</Text> : null}
      </Box>
      <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
        <select value={target} onChange={(e) => setTarget(e.target.value as typeof target)}>
          <option value="current">Current phase</option>
          <option value="next">Next phase</option>
          <option value="run">Whole run (constraint)</option>
        </select>
        <TextInput value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Message the agent mid-run…" sx={{ flex: 1 }} />
        <Button variant="primary" onClick={() => void api.messageRun(run.id, msg, target).then(() => setMsg(""))}>
          Send
        </Button>
      </Box>
    </Box>
  );
}
