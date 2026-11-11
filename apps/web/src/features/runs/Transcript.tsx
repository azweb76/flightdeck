import { Box, Typography } from "@mui/material";
import type { TranscriptEvent } from "@flightdeck/shared";
import { useMemo, useState } from "react";

export function Transcript({ events }: { events: TranscriptEvent[] }) {
  const groups = useMemo(() => group(events), [events]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  return (
    <Box>
      {groups.map((g) => {
        const key = g.key;
        const expanded = open[key] ?? g.key === groups.at(-1)?.key;
        return (
          <Box key={key} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, mb: 2 }}>
            <Box
              component="button"
              onClick={() => setOpen((o) => ({ ...o, [key]: !expanded }))}
              sx={{
                width: "100%",
                textAlign: "left",
                p: 3,
                bgcolor: "background.default",
                border: 0,
                cursor: "pointer",
                color: "text.primary",
                fontSize: 13,
              }}
            >
              {expanded ? "▾" : "▸"} {g.title}
            </Box>
            {expanded
              ? g.events.map((e) => (
                  <Box key={e.id} sx={{ px: 3, py: 2, borderTop: "1px solid", borderColor: "divider" }}>
                    <Typography sx={{ fontFamily: "ui-monospace, monospace", fontSize: 11 }}>
                      {e.tool ?? e.kind}
                    </Typography>
                    <Typography>{e.title}</Typography>
                    {e.path ? (
                      <Typography color="text.secondary" sx={{ fontFamily: "ui-monospace, monospace", fontSize: 11 }}>
                        {e.path}
                      </Typography>
                    ) : null}
                    {e.detail ? (
                      <Box component="pre" sx={{ fontSize: 11, whiteSpace: "pre-wrap", color: "text.secondary", m: 0 }}>
                        {e.detail.slice(0, 800)}
                      </Box>
                    ) : null}
                  </Box>
                ))
              : null}
          </Box>
        );
      })}
    </Box>
  );
}

function group(events: TranscriptEvent[]): { key: string; title: string; events: TranscriptEvent[] }[] {
  const out: { key: string; title: string; events: TranscriptEvent[] }[] = [];
  for (const e of events) {
    const key = `${e.role ?? "run"}-${e.sessionId ?? 0}`;
    const last = out.at(-1);
    if (last && last.key === key) last.events.push(e);
    else out.push({ key, title: `${e.role ?? "run"}`, events: [e] });
  }
  return out;
}
