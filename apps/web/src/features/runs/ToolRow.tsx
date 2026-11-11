import { Box, Collapse, Stack, Typography } from "@mui/material";
import { useState } from "react";
import type { TranscriptEvent } from "@flightdeck/shared";
import { ColoredDiff } from "./ColoredDiff.tsx";
import { parseToolMeta, truncate } from "./toolMeta.ts";
import { ToolGlyph } from "./toolIcons.tsx";

export function ToolRow({ event, result }: { event: TranscriptEvent; result?: TranscriptEvent }) {
  const [open, setOpen] = useState(false);
  const meta = { ...parseToolMeta(event), ...(result ? parseToolMeta(result) : {}) };
  const name = event.tool ?? event.title;
  const target = meta.command || event.path || "";
  return (
    <Box sx={{ borderTop: "1px solid", borderColor: "divider" }}>
      <Stack
        direction="row"
        spacing={1}
        onClick={() => setOpen((v) => !v)}
        sx={{ minHeight: 28, px: 1, py: 0.5, alignItems: "center", cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
      >
        <ToolGlyph tool={name} />
        <Typography sx={{ minWidth: 72, fontWeight: 600 }}>{name}</Typography>
        <Typography sx={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, color: "text.secondary", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {target}
        </Typography>
        <LineCount additions={meta.additions} deletions={meta.deletions} />
      </Stack>
      <Collapse in={open}>
        <Box sx={{ px: 2, pb: 2 }}>
          {meta.input ? (
            <Typography component="pre" sx={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, whiteSpace: "pre-wrap", m: 0, mb: 1 }}>
              {truncate(meta.input, 1500)}
            </Typography>
          ) : null}
          {name.toLowerCase() === "edit" && meta.output ? <ColoredDiff diff={meta.output} /> : null}
          {name.toLowerCase() !== "edit" && meta.output ? (
            <Typography component="pre" sx={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, whiteSpace: "pre-wrap", m: 0, color: "text.secondary" }}>
              {truncate(meta.output)}
            </Typography>
          ) : null}
        </Box>
      </Collapse>
    </Box>
  );
}

function LineCount({ additions, deletions }: { additions?: number; deletions?: number }) {
  if (additions == null && deletions == null) return null;
  return (
    <Stack direction="row" spacing={1} sx={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12 }}>
      {additions != null ? <Typography sx={{ color: "success.main" }}>+{additions}</Typography> : null}
      {deletions != null ? <Typography sx={{ color: "error.main" }}>−{deletions}</Typography> : null}
    </Stack>
  );
}
