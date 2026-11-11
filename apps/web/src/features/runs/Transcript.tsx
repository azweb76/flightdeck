import { Box, Button } from "@mui/material";
import type { Run, TranscriptEvent } from "@flightdeck/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { PhaseSection } from "./PhaseSection.tsx";
import { groupTimeline } from "./timeline.ts";

export function Transcript({ events, run }: { events: TranscriptEvent[]; run?: Run }) {
  const groups = useMemo(() => groupTimeline(events, run), [events, run]);
  const scroller = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(true);

  useEffect(() => {
    if (!pinned) return;
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events, pinned]);

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    setPinned(el.scrollHeight - el.scrollTop - el.clientHeight < 64);
  }

  return (
    <Box sx={{ position: "relative" }}>
      <Box ref={scroller} onScroll={onScroll} sx={{ maxHeight: "calc(100vh - 240px)", overflow: "auto" }}>
        {groups.map((g) => (
          <PhaseSection key={g.key} group={g} expanded />
        ))}
      </Box>
      {!pinned ? (
        <Button
          size="small"
          variant="contained"
          onClick={() => {
            setPinned(true);
            const el = scroller.current;
            if (el) el.scrollTop = el.scrollHeight;
          }}
          sx={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", borderRadius: 4 }}
        >
          Jump to latest
        </Button>
      ) : null}
    </Box>
  );
}
