import { Box, Button, Checkbox, Chip, Stack, Typography } from "@mui/material";
import type { NextItem } from "@flightdeck/shared";
import { api } from "../api/index.ts";
import { FormField } from "../../ui/components/form-field/index.ts";
import { PrimaryAction } from "./PrimaryAction.tsx";

export function NextRow({
  item,
  selected,
  active,
  expanded,
  onToggle,
  onExpand,
  onChanged,
  reply,
  setReply,
}: {
  item: NextItem;
  selected: boolean;
  active: boolean;
  expanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
  onChanged: () => void;
  reply: string;
  setReply: (v: string) => void;
}) {
  return (
    <Box
      onClick={onExpand}
      sx={{
        p: 1.5,
        borderBottom: "1px solid",
        borderColor: "divider",
        borderLeft: active ? "3px solid" : "3px solid transparent",
        borderLeftColor: active ? "warning.main" : "transparent",
        bgcolor: expanded ? "action.selected" : "background.paper",
        cursor: "pointer",
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        {item.action === "start" ? (
          <Checkbox size="small" checked={selected} onClick={(e) => e.stopPropagation()} onChange={onToggle} />
        ) : (
          <Box sx={{ width: 42 }} />
        )}
        <Typography sx={{ width: 28, textAlign: "center" }}>{icon(item.source)}</Typography>
        <Typography sx={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, minWidth: 110 }}>{item.key}</Typography>
        <Typography sx={{ flex: 1, fontWeight: 600 }}>{item.title}</Typography>
        {item.repo ? (
          <Typography sx={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11, color: "text.secondary" }}>{item.repo}</Typography>
        ) : null}
        {item.statusChips.map((c) => (
          <Chip key={c} size="small" label={c} />
        ))}
        <PrimaryAction item={item} onAnswer={onExpand} />
      </Stack>
      {expanded && item.action === "answer" ? <AnswerPad item={item} reply={reply} setReply={setReply} onChanged={onChanged} /> : null}
    </Box>
  );
}

function AnswerPad({
  item,
  reply,
  setReply,
  onChanged,
}: {
  item: NextItem;
  reply: string;
  setReply: (v: string) => void;
  onChanged: () => void;
}) {
  return (
    <Box sx={{ mt: 1, pl: 7 }} onClick={(e) => e.stopPropagation()}>
      <Typography sx={{ mb: 1 }}>{item.question?.prompt ?? item.title}</Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1, mb: 1 }}>
        {(item.question?.options ?? []).map((o, i) => (
          <Button key={o.id} size="small" onClick={() => void api.answerRun(item.runId!, o.label).then(onChanged)}>
            {i + 1}. {o.label}
          </Button>
        ))}
      </Stack>
      <FormField
        label="Reply"
        size="small"
        placeholder="Type a reply · ⌘Enter to send"
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && reply.trim() && item.runId) {
            void api.answerRun(item.runId, reply.trim()).then(onChanged);
          }
        }}
      />
    </Box>
  );
}

function icon(source: NextItem["source"]): string {
  if (source === "jira") return "J";
  if (source === "github" || source === "pr") return "G";
  if (source === "run") return "?";
  return "·";
}
