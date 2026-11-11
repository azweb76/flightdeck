import { Accordion, AccordionDetails, AccordionSummary, Box, Stack, Typography } from "@mui/material";
import type { TranscriptEvent } from "@flightdeck/shared";
import { useMemo } from "react";

export function Transcript({ events }: { events: TranscriptEvent[] }) {
  const groups = useMemo(() => group(events), [events]);
  return (
    <Box>
      {groups.map((g, i) => (
        <Accordion key={g.key} defaultExpanded={i === groups.length - 1} sx={{ "&:before": { display: "none" }, bgcolor: "transparent" }}>
          <AccordionSummary sx={{ minHeight: 28, px: 1, "& .MuiAccordionSummary-content": { my: 0.5 } }}>
            <Typography sx={{ fontWeight: 600 }}>{g.title}</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            {g.events.map((e) => (
              <ToolRow key={e.id} event={e} />
            ))}
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}

function ToolRow({ event }: { event: TranscriptEvent }) {
  const name = event.tool ?? event.title;
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ minHeight: 28, px: 1, py: 0.5, alignItems: "center", borderTop: "1px solid", borderColor: "divider" }}
    >
      <Typography sx={{ minWidth: 88 }}>{name}</Typography>
      {event.path ? (
        <Typography sx={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, color: "text.secondary" }}>
          {event.path}
        </Typography>
      ) : (
        <Typography color="text.secondary">{event.title !== name ? event.title : ""}</Typography>
      )}
    </Stack>
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
