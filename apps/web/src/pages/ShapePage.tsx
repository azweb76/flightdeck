import { Alert, Box, Button, Chip, Paper, Stack, TextField, Typography } from "@mui/material";
import { DRAFT_SECTION_LABELS, DRAFT_SECTIONS, type ChatMessage, type ShapeSession } from "@flightdeck/shared";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api.ts";
import { SaveIssueDialog } from "./SaveIssueDialog.tsx";

export function ShapePage() {
  const { id } = useParams();
  const [session, setSession] = useState<ShapeSession>();
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getShape(id).then(setSession).catch((e: Error) => setError(e.message));
  }, [id]);

  async function send(text: string) {
    if (!id || !text.trim()) return;
    setBusy(true);
    setError("");
    try {
      setSession(await api.replyShape(id, text.trim()));
      setReply("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reply failed");
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return error ? <Alert severity="error">{error}</Alert> : <Typography color="text.secondary">Loading…</Typography>;
  }

  return (
    <Stack spacing={3}>
      <Header session={session} savedKey={savedKey} onSave={() => setSaveOpen(true)} />
      {error ? <Alert severity="error">{error}</Alert> : null}
      {savedKey ? (
        <Alert severity="success" data-testid="saved-banner">
          Saved as {savedKey}. Waiting until you click Start.
        </Alert>
      ) : null}
      <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="stretch">
        <ChatPane session={session} reply={reply} busy={busy} saved={Boolean(savedKey)} onReply={setReply} onSend={send} />
        <DraftPane session={session} />
      </Stack>
      <SaveIssueDialog
        open={saveOpen}
        session={session}
        onClose={() => setSaveOpen(false)}
        onError={setError}
        onSaved={(issue) => {
          setSavedKey(issue.key);
          setSaveOpen(false);
        }}
      />
    </Stack>
  );
}

function Header(props: { session: ShapeSession; savedKey: string; onSave: () => void }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2}>
      <Box>
        <Typography variant="h4">Shape the goal</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Chat on the left. The live issue draft is on the right. Repo {props.session.repoSlug}.
        </Typography>
      </Box>
      <Stack direction="row" gap={1}>
        <Button variant="outlined" onClick={props.onSave} data-testid="save-issue">
          Save issue
        </Button>
        <Button variant="contained" disabled data-testid="start-run">
          Start
        </Button>
      </Stack>
    </Stack>
  );
}

function ChatPane(props: {
  session: ShapeSession;
  reply: string;
  busy: boolean;
  saved: boolean;
  onReply: (v: string) => void;
  onSend: (text: string) => void;
}) {
  return (
    <Paper sx={{ p: 3, flex: 1, minWidth: 0, border: 1, borderColor: "divider" }} data-testid="chat-pane">
      <Typography variant="h6" sx={{ mb: 2 }}>
        Chat
      </Typography>
      <Stack spacing={2} sx={{ mb: 3, minHeight: 280 }}>
        {props.session.messages.map((m) => (
          <MessageBubble key={m.id} msg={m} disabled={props.busy || props.saved} onPick={(id) => props.onSend(id)} />
        ))}
      </Stack>
      <Stack direction="row" gap={1}>
        <TextField
          value={props.reply}
          onChange={(e) => props.onReply(e.target.value)}
          placeholder="Reply"
          disabled={props.busy || props.saved}
          inputProps={{ "data-testid": "chat-input" }}
        />
        <Button variant="contained" disabled={props.busy || props.saved} onClick={() => props.onSend(props.reply)}>
          Send
        </Button>
      </Stack>
    </Paper>
  );
}

function MessageBubble(props: { msg: ChatMessage; disabled: boolean; onPick: (label: string) => void }) {
  const mine = props.msg.role === "user";
  return (
    <Box
      sx={{
        p: 1.75,
        borderRadius: 2,
        bgcolor: mine ? "action.hover" : "action.selected",
        border: 1,
        borderColor: "divider",
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {mine ? "You" : "Claude"}
      </Typography>
      <Typography sx={{ whiteSpace: "pre-wrap" }}>{visibleText(props.msg.text)}</Typography>
      {props.msg.options?.length ? (
        <Stack direction="row" gap={1} sx={{ mt: 1 }} flexWrap="wrap">
          {props.msg.options.map((o) => (
            <Chip
              key={o.id}
              label={o.label}
              clickable={!props.disabled}
              onClick={() => props.onPick(o.label)}
              data-testid={`option-${o.id}`}
            />
          ))}
        </Stack>
      ) : null}
    </Box>
  );
}

function visibleText(text: string): string {
  const cleaned = text.replace(/```json[\s\S]*?```/g, "").trim();
  return cleaned || "Updated the draft.";
}

function DraftPane(props: { session: ShapeSession }) {
  const draft = props.session.draft;
  return (
    <Paper sx={{ p: 3, flex: 1, minWidth: 0, border: 1, borderColor: "divider" }} data-testid="draft-pane">
      <Typography variant="h6" sx={{ mb: 2 }}>
        Issue draft
      </Typography>
      <Typography variant="subtitle2" color="text.secondary">
        {DRAFT_SECTION_LABELS.title}
      </Typography>
      <Typography variant="h5" sx={{ mb: 3 }} data-testid="draft-title">
        {draft.title || "Untitled"}
      </Typography>
      {DRAFT_SECTIONS.map((key) => (
        <Box key={key} sx={{ mb: 2.5 }} data-testid={`draft-${key}`}>
          <Typography variant="subtitle2" color="text.secondary">
            {DRAFT_SECTION_LABELS[key]}
          </Typography>
          <Typography sx={{ whiteSpace: "pre-wrap" }}>{draft[key] || "—"}</Typography>
        </Box>
      ))}
    </Paper>
  );
}
