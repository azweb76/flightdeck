import { Box, Chip, Paper, Stack, TextField, Typography } from "@mui/material";
import type { Change, ChangeEvent } from "@flightdeck/shared";
import { useEffect, useRef } from "react";
import { ContainedButton } from "../ui/ContainedButton.tsx";
import { FormField } from "../ui/FormField.tsx";

export function TranscriptPane(props: {
  change: Change;
  reply: string;
  busy: boolean;
  onReply: (v: string) => void;
  onSend: (text: string) => void;
}) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [props.change.events.length]);
  const waiting = props.change.status === "asking" || props.change.status === "needs_dan";
  const canSend = waiting && !props.busy && props.reply.trim().length > 0;

  return (
    <Paper
      sx={{
        p: 3,
        flex: 1,
        minHeight: { xs: 480, lg: 0 },
        minWidth: 0,
        border: 1,
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
      }}
      data-testid="transcript"
    >
      <Typography variant="h6" sx={{ mb: 2 }}>
        Transcript
      </Typography>
      <Stack spacing={1.25} sx={{ flex: 1, minHeight: 0, overflow: "auto", pr: 1 }}>
        {props.change.events.map((ev) => (
          <EventRow key={ev.id} ev={ev} waiting={waiting && !props.busy} onPick={(label) => props.onSend(label)} />
        ))}
        <div ref={end} />
      </Stack>
      <Box sx={{ mt: 2 }}>
        <FormField label="Reply">
          <Stack direction="row" gap={1} alignItems="flex-start">
            <TextField
              value={props.reply}
              onChange={(e) => props.onReply(e.target.value)}
              placeholder={waiting ? "Answer the agent" : "The agent only pauses when it needs you"}
              disabled={!waiting || props.busy}
              multiline
              minRows={1}
              maxRows={6}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (canSend) props.onSend(props.reply);
                }
              }}
              inputProps={{ "data-testid": "run-reply" }}
            />
            <ContainedButton disabled={!canSend} onClick={() => props.onSend(props.reply)} data-testid="run-send">
              Send
            </ContainedButton>
          </Stack>
        </FormField>
      </Box>
    </Paper>
  );
}

function EventRow(props: { ev: ChangeEvent; waiting: boolean; onPick: (label: string) => void }) {
  if (props.ev.kind === "stage") {
    return (
      <Box sx={{ py: 0.5 }} data-testid={`event-stage-${props.ev.title}`}>
        <Typography variant="subtitle2" color="text.secondary">
          {props.ev.title}
          {props.ev.detail ? ` · ${props.ev.detail}` : ""}
        </Typography>
      </Box>
    );
  }
  if (props.ev.kind === "usage") {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ pl: 3, mt: -1.25, lineHeight: 1.2, display: "block" }} data-testid="event-usage">
        {props.ev.detail ?? (props.ev.costUsd != null ? `$${props.ev.costUsd.toFixed(2)}` : "usage")}
      </Typography>
    );
  }
  const mine = props.ev.kind === "user";
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        alignSelf: mine ? "flex-end" : "flex-start",
        maxWidth: "94%",
        bgcolor: mine ? "primary.main" : "action.hover",
        color: mine ? "primary.contrastText" : "text.primary",
        border: 1,
        borderColor: mine ? "primary.main" : "divider",
      }}
      data-testid={`event-${props.ev.kind}`}
    >
      <Typography variant="caption" sx={{ opacity: 0.8 }}>
        {mine ? "You" : props.ev.title}
      </Typography>
      {props.ev.detail && props.ev.detail !== props.ev.title ? (
        <Typography sx={{ whiteSpace: "pre-wrap" }}>{props.ev.detail}</Typography>
      ) : null}
      {props.ev.ask?.options?.length ? (
        <Stack direction="row" gap={1} sx={{ mt: 1 }} flexWrap="wrap">
          {props.ev.ask.options.map((o) => (
            <Chip
              key={o.id}
              label={o.label}
              clickable={props.waiting}
              disabled={!props.waiting}
              onClick={() => props.onPick(o.label)}
              data-testid={`run-option-${o.id}`}
              variant="outlined"
              sx={{ color: "inherit", borderColor: "currentColor" }}
            />
          ))}
        </Stack>
      ) : null}
    </Box>
  );
}
