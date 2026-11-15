import { Alert, Box, Container, Stack, Typography } from "@mui/material";
import { ContrastAlert } from "../ui/ContrastAlert.tsx";
import type { AppEvent, Change } from "@flightdeck/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api.ts";
import { useAppEvents } from "../useAppEvents.ts";
import { ChangeHeader } from "./ChangeHeader.tsx";
import { StageTimeline } from "./StageTimeline.tsx";
import { Chat, fromEvents } from "../features/chat/index.ts";

export function ChangePage() {
  const { id } = useParams();
  const nav = useNavigate();
  const state = useChange(id);

  if (!state.change) {
    return state.error ? <Alert severity="error">{state.error}</Alert> : <Typography color="text.secondary">Loading…</Typography>;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 5, px: { xs: 3, md: 4 }, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }} data-testid="change-page">
    <Stack spacing={4} sx={{ flex: 1, minHeight: 0 }}>
      <ChangeHeader
        change={state.change}
        onRuns={() => nav("/runs")}
        onArchive={() => void state.archive()}
        onResume={() => void state.resume()}
      />
      {state.error ? <Alert severity="error">{state.error}</Alert> : null}
      {state.change.status === "queued" ? (
        <ContrastAlert severity="info" data-testid="run-queued">
          Waiting for a free agent slot. This starts automatically when another run finishes or is archived.
        </ContrastAlert>
      ) : null}
      {state.change.interrupted ? (
        <ContrastAlert severity="warning" data-testid="run-interrupted">
          This run stopped when the app restarted. Resume continues from the current stage.
        </ContrastAlert>
      ) : null}
      {state.change.status === "needs_dan" ? (
        <ContrastAlert severity="warning" data-testid="needs-dan">
          {state.change.stage === "ci"
            ? "CI still fails after 3 automatic fixes. Tell me how to proceed, or archive this run."
            : "Review failed 3 times. Tell me how to proceed, or archive this run."}
        </ContrastAlert>
      ) : null}
      {state.change.status === "cap_hit" ? (
        <ContrastAlert severity="error" data-testid="cap-hit">
          {[...state.change.events].reverse().find((e) => e.title === "cap")?.detail ??
            "This run hit a dollar cap. Raise the cap in Settings if you want to try again."}
        </ContrastAlert>
      ) : null}
      <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems="stretch" sx={{ flex: { lg: 1 }, minHeight: { lg: 0 } }}>
        <Box sx={{ width: { lg: 320 }, flexShrink: 0 }}>
          <StageTimeline change={state.change} />
        </Box>
        <RunChat
          change={state.change}
          reply={state.reply}
          busy={state.busy}
          onReply={state.setReply}
          onSend={(t) => void state.send(t)}
        />
      </Stack>
    </Stack>
    </Container>
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
    send: async (text: string, optionId?: string) => {
      if (!id || !text.trim() || sending.current) return;
      sending.current = true;
      setBusy(true);
      setError("");
      try {
        setChange(await api.replyChange(id, text.trim(), optionId));
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
    resume: async () => {
      if (!id) return;
      try {
        setChange(await api.resumeChange(id));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not resume");
      }
    },
  };
}

function RunChat(props: {
  change: Change;
  reply: string;
  busy: boolean;
  onReply: (v: string) => void;
  onSend: (text: string, optionId?: string) => void;
}) {
  const waiting = props.change.status === "asking" || props.change.status === "needs_dan";
  return (
    <Chat
      title="Transcript"
      testId="transcript"
      entries={fromEvents(props.change.events)}
      reply={props.reply}
      onReply={props.onReply}
      onSend={props.onSend}
      canSend={waiting && !props.busy && props.reply.trim().length > 0}
      disabled={!waiting || props.busy}
      placeholder={waiting ? "Answer the agent" : "The agent only pauses when it needs you"}
      inputTestId="run-reply"
      sendTestId="run-send"
      compact
      autoScroll
      spacing={1.25}
      paperSx={{ flex: 1, minHeight: { xs: 480, lg: 0 } }}
    />
  );
}
