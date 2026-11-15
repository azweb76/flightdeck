import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import type { AppEvent, ShapeSession } from "@flightdeck/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api.ts";
import { GatedButton } from "../preflight/index.ts";
import { sessionFromEvent, useAppEvents } from "../useAppEvents.ts";
import { Chat, fromMessages } from "../features/chat/index.ts";
import { DraftPane } from "./DraftPane.tsx";
import { SaveIssueDialog } from "./SaveIssueDialog.tsx";

export function ShapePage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [session, setSession] = useState<ShapeSession>();
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);

  useEffect(() => {
    if (!id) return;
    api.getShape(id).then(setSession).catch((e: Error) => setError(e.message));
  }, [id]);

  const onEvent = useCallback(
    (ev: AppEvent) => {
      if (!id) return;
      const next = sessionFromEvent(ev, id);
      if (next) setSession(next);
    },
    [id],
  );
  useAppEvents(onEvent);

  async function send(text: string) {
    if (!id || !text.trim() || sending.current) return;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      setSession(await api.replyShape(id, text.trim()));
      setReply("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reply failed");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  if (!session) {
    return error ? <Alert severity="error">{error}</Alert> : <Typography color="text.secondary">Loading…</Typography>;
  }

  const saved = Boolean(session.savedKey);

  return (
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0, p: { xs: 2, md: 3 } }}>
      <Header
        session={session}
        saved={saved}
        onSave={() => {
          setError("");
          setSaveOpen(true);
        }}
        onStart={() => void beginRun(session.issueId, nav, setError)}
      />
      {error ? <Alert severity="error">{error}</Alert> : null}
      {saved ? (
        <Alert severity="success" data-testid="saved-banner">
          Saved as {session.savedKey}. Waiting until you click Start.
        </Alert>
      ) : null}
      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={2}
        alignItems="stretch"
        sx={{ flex: { lg: 1 }, minHeight: { lg: 0 }, overflow: { lg: "hidden" } }}
      >
        <RefineChat session={session} reply={reply} busy={busy} saved={saved} onReply={setReply} onSend={(t) => void send(t)} />
        <DraftPane session={session} />
      </Stack>
      <SaveIssueDialog
        open={saveOpen}
        session={session}
        onClose={() => { setSaveOpen(false); setError(""); }}
        onSaved={(issue) => {
          setSession({ ...session, savedKey: issue.key, issueId: issue.id });
          setSaveOpen(false);
          setError("");
        }}
      />
    </Stack>
  );
}

async function beginRun(
  issueId: string | undefined,
  nav: ReturnType<typeof useNavigate>,
  setError: (msg: string) => void,
): Promise<void> {
  if (!issueId) {
    setError("Save the issue before starting a change");
    return;
  }
  try {
    const change = await api.startChange(issueId);
    nav(`/runs/${change.id}`);
  } catch (e) {
    setError(e instanceof Error ? e.message : "Could not start");
  }
}

function Header(props: { session: ShapeSession; saved: boolean; onSave: () => void; onStart: () => void }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2} sx={{ flexShrink: 0 }}>
      <Box>
        <Typography variant="h4">Refine the goal</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          Chat and draft stay in view. Repo {props.session.repoSlug}.
        </Typography>
      </Box>
      <Stack direction="row" gap={1}>
        <Button variant="outlined" disabled={props.saved} onClick={props.onSave} data-testid="save-issue">
          Save issue
        </Button>
        <GatedButton
          gate="start"
          variant="contained"
          placement="bottom"
          disabled={!props.saved}
          fallbackTitle={props.saved ? undefined : "Save the issue first"}
          onClick={props.onStart}
          testId="start-run"
        >
          Start
        </GatedButton>
      </Stack>
    </Stack>
  );
}

function RefineChat(props: {
  session: ShapeSession;
  reply: string;
  busy: boolean;
  saved: boolean;
  onReply: (v: string) => void;
  onSend: (text: string) => void;
}) {
  return (
    <Chat
      title="Chat"
      testId="chat-pane"
      entries={fromMessages(props.session.messages)}
      reply={props.reply}
      onReply={props.onReply}
      onSend={props.onSend}
      canSend={!props.busy && !props.saved && props.reply.trim().length > 0}
      disabled={props.busy || props.saved}
      placeholder="Type a reply"
      inputTestId="chat-input"
      autoScroll
      sendSx={{ mt: 2 }}
      paperSx={{
        flex: { xs: "none", lg: 1 },
        minHeight: { xs: 520, lg: 0 },
        height: { lg: "100%" },
        overflow: "hidden",
      }}
    />
  );
}
