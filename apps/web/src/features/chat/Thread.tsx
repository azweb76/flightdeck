import { Box, Chip, Stack, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { Markdown } from "../markdown/index.ts";
import type { ChatEntry } from "./entries.ts";

export function Thread(props: {
  entries: ChatEntry[];
  disabled: boolean;
  onPick: (label: string) => void;
  spacing: number;
  compact: boolean;
  autoScroll?: boolean;
}) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (props.autoScroll) end.current?.scrollIntoView({ block: "end" });
  }, [props.autoScroll, props.entries.length]);
  return (
    <Stack spacing={props.spacing} sx={{ flex: 1, minHeight: 0, overflow: "auto", pr: 1 }}>
      {props.entries.map((entry) => (
        <Entry key={entry.id} entry={entry} disabled={props.disabled} compact={props.compact} onPick={props.onPick} />
      ))}
      {props.autoScroll ? <div ref={end} /> : null}
    </Stack>
  );
}

function Entry(props: { entry: ChatEntry; disabled: boolean; compact: boolean; onPick: (label: string) => void }) {
  const { entry } = props;
  if (entry.type === "stage") {
    return (
      <Box sx={{ py: 0.5 }} data-testid={`event-stage-${entry.title}`}>
        <Typography variant="subtitle2" color="text.secondary">
          {entry.title}
          {entry.detail ? ` · ${entry.detail}` : ""}
        </Typography>
      </Box>
    );
  }
  if (entry.type === "usage") {
    return (
      <Typography color="text.secondary" data-testid="event-usage" sx={{ pl: 3, mt: -1.25, lineHeight: 1.2, display: "block" }} variant="caption">
        {entry.text}
      </Typography>
    );
  }
  return <Bubble entry={entry} disabled={props.disabled} compact={props.compact} onPick={props.onPick} />;
}

function Bubble(props: {
  entry: Extract<ChatEntry, { type: "bubble" }>;
  disabled: boolean;
  compact: boolean;
  onPick: (label: string) => void;
}) {
  const { entry } = props;
  const [picked, setPicked] = useState(false);
  const locked = props.disabled || (entry.lockPick && picked);
  return (
    <Box
      data-testid={entry.kindTestId}
      sx={{
        p: props.compact ? 1.5 : 1.75,
        borderRadius: 2,
        alignSelf: entry.mine ? "flex-end" : "flex-start",
        maxWidth: props.compact ? "94%" : "92%",
        bgcolor: entry.mine ? "primary.main" : "action.hover",
        color: entry.mine ? "primary.contrastText" : "text.primary",
        border: 1,
        borderColor: entry.mine ? "primary.main" : "divider",
      }}
    >
      <Typography variant="caption" sx={{ opacity: 0.8 }}>
        {entry.caption}
      </Typography>
      {entry.body ? <Markdown text={entry.body} /> : null}
      {entry.options?.length ? (
        <Stack direction="row" gap={1} sx={{ mt: 1 }} flexWrap="wrap">
          {entry.options.map((o) => (
            <Chip
              key={o.id}
              label={o.label}
              clickable={!locked}
              disabled={Boolean(locked)}
              onClick={() => {
                if (locked) return;
                setPicked(true);
                props.onPick(o.label);
              }}
              data-testid={entry.optionTestId(o.id)}
              variant="outlined"
              sx={{ color: "inherit", borderColor: "currentColor", bgcolor: entry.lockPick ? "transparent" : undefined }}
            />
          ))}
        </Stack>
      ) : null}
    </Box>
  );
}
