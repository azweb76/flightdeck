import { useEffect, useState } from "react";
import { Box, Button, Heading, Text, TextInput } from "@primer/react";
import type { Run, TranscriptEvent } from "@flightdeck/shared";
import { Link, useParams } from "react-router-dom";
import { api, subscribeEvents } from "../api/index.ts";
import { Transcript } from "./Transcript.tsx";
import { RunActions } from "./RunActions.tsx";

export function RunView() {
  const { id } = useParams();
  const [run, setRun] = useState<Run>();
  const [events, setEvents] = useState<TranscriptEvent[]>([]);
  const [diff, setDiff] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
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
    void api.runDiff(Number(id)).then((d) => setDiff(d.diff)).catch(() => setDiff(""));
    void api.sessionReviewGet(Number(id)).then((s) => setReviewNotes(s.score.notes)).catch(() => undefined);
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
      <RunActions run={run} onRun={setRun} onReview={setReviewNotes} answer={answer} setAnswer={setAnswer} />
      <RunTabs tab={tab} setTab={setTab} events={events} diff={diff} reviewNotes={reviewNotes} />
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

function RunTabs({
  tab,
  setTab,
  events,
  diff,
  reviewNotes,
}: {
  tab: "transcript" | "diff" | "plan" | "review";
  setTab: (t: typeof tab) => void;
  events: TranscriptEvent[];
  diff: string;
  reviewNotes: string;
}) {
  return (
    <>
      <Box sx={{ display: "flex", gap: 3, mb: 3 }}>
        {(["transcript", "diff", "plan", "review"] as const).map((t) => (
          <Box as="button" key={t} onClick={() => setTab(t)} sx={{ appearance: "none", bg: "transparent", border: 0, fontWeight: tab === t ? 600 : 400, cursor: "pointer" }}>
            {t}
          </Box>
        ))}
      </Box>
      <Box sx={{ flex: 1 }}>
        {tab === "transcript" ? <Transcript events={events} /> : null}
        {tab === "diff" ? <Text as="pre" sx={{ fontSize: 1, whiteSpace: "pre-wrap" }}>{diff || "No diff yet."}</Text> : null}
        {tab === "plan" ? <Text as="pre">{events.find((e) => e.role === "planner")?.detail ?? "No plan yet."}</Text> : null}
        {tab === "review" ? <Text as="pre" sx={{ whiteSpace: "pre-wrap" }}>{reviewNotes || "Press Review session to score this run."}</Text> : null}
      </Box>
    </>
  );
}
