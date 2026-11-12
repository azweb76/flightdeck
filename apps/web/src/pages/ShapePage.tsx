import { Alert, Box, Button, Stack, Tooltip, Typography } from "@mui/material";
import type { AppEvent, ShapeSession } from "@flightdeck/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api.ts";
import { sessionFromEvent, useAppEvents } from "../useAppEvents.ts";
import { ChatPane } from "./ChatPane.tsx";
import { DraftPane } from "./DraftPane.tsx";
import { SaveIssueDialog } from "./SaveIssueDialog.tsx";

export function ShapePage() {
  const { id } = useParams();
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
      <Header session={session} saved={saved} onSave={() => { setError(""); setSaveOpen(true); }} />
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
        <ChatPane session={session} reply={reply} busy={busy} saved={saved} onReply={setReply} onSend={(t) => void send(t)} />
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

function Header(props: { session: ShapeSession; saved: boolean; onSave: () => void }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2} sx={{ flexShrink: 0 }}>
      <Box>
        <Typography variant="h4">Shape the goal</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          Chat and draft stay in view. Repo {props.session.repoSlug}.
        </Typography>
      </Box>
      <Stack direction="row" gap={1}>
        <Button variant="outlined" disabled={props.saved} onClick={props.onSave} data-testid="save-issue">
          Save issue
        </Button>
        <Tooltip title="Coming in Phase 2">
          <span>
            <Button variant="text" disabled data-testid="start-run">
              Start
            </Button>
          </span>
        </Tooltip>
      </Stack>
    </Stack>
  );
}
