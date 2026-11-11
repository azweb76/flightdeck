import { useEffect, useState } from "react";
import type { Run, TranscriptEvent } from "@flightdeck/shared";
import { api, subscribeEvents } from "../api/index.ts";

export function useRun(id: string | undefined) {
  const [run, setRun] = useState<Run>();
  const [error, setError] = useState<string>();
  const [events, setEvents] = useState<TranscriptEvent[]>([]);
  const [diff, setDiff] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [findings, setFindings] = useState<{ title: string; detail: string; excerpt?: string }[]>([]);

  function load() {
    if (!id) return;
    void api
      .run(Number(id))
      .then((r) => {
        setRun(r.run);
        setEvents(r.events);
        setError(undefined);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Run not found"));
    void api
      .runDiff(Number(id))
      .then((d) => setDiff(d.diff))
      .catch(() => setDiff(""));
    void api
      .sessionReviewGet(Number(id))
      .then((s) => {
        setReviewNotes(s.score.notes);
        setFindings(s.findings ?? []);
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    load();
    return subscribeEvents(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return { run, setRun, error, events, diff, reviewNotes, setReviewNotes, findings };
}
