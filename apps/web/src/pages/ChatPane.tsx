import { Box, Button, Chip, Paper, Stack, TextField, Typography } from "@mui/material";
import type { ChatMessage, ShapeSession } from "@flightdeck/shared";
import { useState } from "react";
import { FormField } from "../ui/FormField.tsx";

export function ChatPane(props: {
  session: ShapeSession;
  reply: string;
  busy: boolean;
  saved: boolean;
  onReply: (v: string) => void;
  onSend: (text: string) => void;
}) {
  const locked = props.busy || props.saved;
  const canSend = !locked && props.reply.trim().length > 0;

  return (
    <Paper
      sx={{
        p: 3,
        flex: { xs: "none", lg: 1 },
        minHeight: { xs: 520, lg: 0 },
        height: { lg: "100%" },
        minWidth: 0,
        overflow: "hidden",
        border: 1,
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
      }}
      data-testid="chat-pane"
    >
      <Typography variant="h6" sx={{ mb: 2 }}>
        Chat
      </Typography>
      <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0, overflow: "auto", pr: 1 }}>
        {props.session.messages.map((m) => (
          <MessageBubble key={m.id} msg={m} disabled={locked} onPick={(label) => props.onSend(label)} />
        ))}
      </Stack>
      <Box sx={{ mt: 2 }}>
        <FormField label="Reply">
          <Stack direction="row" gap={1} alignItems="flex-start">
            <TextField
              value={props.reply}
              onChange={(e) => props.onReply(e.target.value)}
              placeholder="Type a reply"
              disabled={locked}
              multiline
              minRows={1}
              maxRows={6}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (canSend) props.onSend(props.reply);
                }
              }}
              inputProps={{ "data-testid": "chat-input" }}
            />
            <Button variant="contained" disabled={!canSend} onClick={() => props.onSend(props.reply)} sx={{ mt: 0.25 }}>
              Send
            </Button>
          </Stack>
        </FormField>
      </Box>
    </Paper>
  );
}

function MessageBubble(props: { msg: ChatMessage; disabled: boolean; onPick: (label: string) => void }) {
  const mine = props.msg.role === "user";
  const text = visibleText(props.msg.text);
  const [picked, setPicked] = useState(false);
  const locked = props.disabled || picked;
  return (
    <Box
      sx={{
        p: 1.75,
        borderRadius: 2,
        alignSelf: mine ? "flex-end" : "flex-start",
        maxWidth: "92%",
        bgcolor: mine ? "primary.main" : "action.hover",
        color: mine ? "primary.contrastText" : "text.primary",
        border: 1,
        borderColor: mine ? "primary.main" : "divider",
      }}
    >
      <Typography variant="caption" sx={{ opacity: 0.8 }}>
        {mine ? "You" : "Claude"}
      </Typography>
      <Typography sx={{ whiteSpace: "pre-wrap" }}>{text}</Typography>
      {props.msg.options?.length ? (
        <Stack direction="row" gap={1} sx={{ mt: 1 }} flexWrap="wrap">
          {props.msg.options.map((o) => (
            <Chip
              key={o.id}
              label={o.label}
              clickable={!locked}
              disabled={locked}
              onClick={() => {
                if (locked) return;
                setPicked(true);
                props.onPick(o.label);
              }}
              data-testid={`option-${o.id}`}
              variant="outlined"
              sx={{ color: "inherit", borderColor: "currentColor", bgcolor: "transparent" }}
            />
          ))}
        </Stack>
      ) : null}
    </Box>
  );
}

function visibleText(text: string): string {
  return text.replace(/```json[\s\S]*?```/g, "").trim() || "Updated the draft.";
}
