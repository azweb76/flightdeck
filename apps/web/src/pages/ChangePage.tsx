import { Alert, Box, Stack, Typography } from "@mui/material";
import type { AppEvent, Change } from "@flightdeck/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api.ts";
import { useAppEvents } from "../useAppEvents.ts";
import { ChangeHeader } from "./ChangeHeader.tsx";
import { StageTimeline } from "./StageTimeline.tsx";
import { TranscriptPane } from "./TranscriptPane.tsx";

export function ChangePage() {
  const { id } = useParams();
  const nav = useNavigate();
  const state = useChange(id);

  if (!state.change) {
    return state.error ? <Alert severity="error">{state.error}</Alert> : <Typography color="text.secondary">Loading…</Typography>;
  }

  return (
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0, p: { xs: 2, md: 3 } }} data-testid="change-page">
      <ChangeHeader change={state.change} onRuns={() => nav("/runs")} onArchive={() => void state.archive()} />
      {state.error ? <Alert severity="error">{state.error}</Alert> : null}
      {state.change.status === "needs_dan" ? (
        <Alert severity="warning" data-testid="needs-dan">
          Review failed 3 times. Tell me how to proceed, or archive this run.
        </Alert>
      ) : null}
      {state.change.status === "cap_hit" ? (
        <Alert severity="warning" data-testid="cap-hit">
          This run hit a dollar cap. Raise the cap in Settings if you want to try again.
        </Alert>
      ) : null}
      <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems="stretch" sx={{ flex: { lg: 1 }, minHeight: { lg: 0 } }}>
        <Box sx={{ width: { lg: 320 }, flexShrink: 0 }}>
          <StageTimeline change={state.change} />
        </Box>
        <TranscriptPane
          change={state.change}
          reply={state.reply}
          busy={state.busy}
          onReply={state.setReply}
          onSend={(t) => void state.send(t)}
        />
      </Stack>
    </Stack>
  );
}

function useChange(id: string | undefined) {
  const [change, setChange] = useState<Change>();
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);

  useEffect(() => {
    if (!id) return;
    api.getChange(id).then(setChange).catch((e: Error) => setError(e.message));
  }, [id]);

  useAppEvents(
    useCallback(
      (ev: AppEvent) => {
        if (!id || ev.type !== "change.updated") return;
        const payload = ev.payload as { id?: string; change?: Change } | undefined;
        if (payload?.change?.id === id) setChange(payload.change);
      },
      [id],
    ),
  );

  return {
    change,
    error,
    reply,
    busy,
    setReply,
    send: async (text: string) => {
      if (!id || !text.trim() || sending.current) return;
      sending.current = true;
      setBusy(true);
      setError("");
      try {
        setChange(await api.replyChange(id, text.trim()));
        setReply("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Reply failed");
      } finally {
        sending.current = false;
        setBusy(false);
      }
    },
    archive: async () => {
      if (!id) return;
      try {
        setChange(await api.archiveChange(id));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not archive");
      }
    },
  };
}
