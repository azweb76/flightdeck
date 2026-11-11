import { Box, Text } from "@primer/react";
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
          <Box key={key} sx={{ border: "1px solid", borderColor: "border.default", borderRadius: 2, mb: 2 }}>
            <Box
              as="button"
              onClick={() => setOpen((o) => ({ ...o, [key]: !expanded }))}
              sx={{ width: "100%", textAlign: "left", p: 3, bg: "canvas.subtle", border: 0, cursor: "pointer" }}
            >
              {expanded ? "▾" : "▸"} {g.title}
            </Box>
            {expanded
              ? g.events.map((e) => (
                  <Box key={e.id} sx={{ px: 3, py: 2, borderTop: "1px solid", borderColor: "border.muted" }}>
                    <Text sx={{ fontFamily: "mono", fontSize: 0 }}>{e.tool ?? e.kind}</Text>{" "}
                    <Text sx={{ fontSize: 1 }}>{e.title}</Text>
                    {e.path ? <Text sx={{ color: "fg.muted", fontFamily: "mono", fontSize: 0 }}> {e.path}</Text> : null}
                    {e.detail ? (
                      <Text as="pre" sx={{ fontSize: 0, whiteSpace: "pre-wrap", color: "fg.muted" }}>
                        {e.detail.slice(0, 800)}
                      </Text>
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
