import { Box, Paper, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { mergeSx } from "../../ui/mergeSx.ts";
import { Composer } from "./Composer.tsx";
import type { ChatEntry } from "./entries.ts";
import { Thread } from "./Thread.tsx";

const paneSx = {
  p: 3,
  minWidth: 0,
  border: 1,
  borderColor: "divider",
  display: "flex",
  flexDirection: "column",
} as const;

export function Chat(props: {
  title: string;
  testId: string;
  entries: ChatEntry[];
  reply: string;
  onReply: (v: string) => void;
  onSend: (text: string) => void;
  canSend: boolean;
  disabled: boolean;
  placeholder: string;
  inputTestId: string;
  sendTestId?: string;
  sendSx?: SxProps<Theme>;
  paperSx?: SxProps<Theme>;
  spacing?: number;
  compact?: boolean;
  autoScroll?: boolean;
}) {
  return (
    <Paper sx={mergeSx(paneSx, props.paperSx)} data-testid={props.testId}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {props.title}
      </Typography>
      <Thread
        entries={props.entries}
        disabled={props.disabled}
        onPick={props.onSend}
        spacing={props.spacing ?? 1.5}
        compact={Boolean(props.compact)}
        autoScroll={props.autoScroll}
      />
      <Box sx={{ mt: 2, flexShrink: 0 }}>
        <Composer
          value={props.reply}
          onChange={props.onReply}
          onSend={props.onSend}
          canSend={props.canSend}
          disabled={props.disabled}
          placeholder={props.placeholder}
          inputTestId={props.inputTestId}
          sendTestId={props.sendTestId}
          sendSx={props.sendSx}
        />
      </Box>
    </Paper>
  );
}
