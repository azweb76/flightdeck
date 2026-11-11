import { Box, Collapse, Typography } from "@mui/material";
import { useState } from "react";
import { classifyPr, PR_COLUMN_TITLE, PR_OPEN_COLUMNS, type BoardPr, type PrColumn } from "@flightdeck/shared";
import { PrCard } from "./PrCard.tsx";

export function PrBoard({
  prs,
  tab,
  onOpen,
}: {
  prs: BoardPr[];
  tab: "mine" | "review";
  onOpen: (pr: BoardPr) => void;
}) {
  const [showMerged, setShowMerged] = useState(false);
  const grouped = group(prs);
  return (
    <Box>
      <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start", overflowX: "auto", pb: 3 }}>
        {PR_OPEN_COLUMNS.map((col) => (
          <Box key={col} sx={{ minWidth: 260, flex: "0 0 260px" }}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>
              {PR_COLUMN_TITLE[col]} ({grouped[col].length})
            </Typography>
            {grouped[col].map((pr) => (
              <Box key={pr.id} sx={{ mb: 1 }}>
                <PrCard pr={pr} tab={tab} onOpen={() => onOpen(pr)} />
              </Box>
            ))}
          </Box>
        ))}
      </Box>
      <Typography
        component="button"
        onClick={() => setShowMerged((v) => !v)}
        sx={{ border: 0, bgcolor: "transparent", color: "text.secondary", cursor: "pointer", p: 0, mb: 1 }}
      >
        {PR_COLUMN_TITLE.merged_closed} last 7 days ({grouped.merged_closed.length}) {showMerged ? "▾" : "▸"}
      </Typography>
      <Collapse in={showMerged}>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {grouped.merged_closed.map((pr) => (
            <Box key={pr.id} sx={{ width: 260 }}>
              <PrCard pr={pr} tab={tab} onOpen={() => onOpen(pr)} />
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

function group(prs: BoardPr[]): Record<PrColumn, BoardPr[]> {
  const out: Record<PrColumn, BoardPr[]> = {
    draft: [],
    ci_failing: [],
    changes_requested: [],
    needs_review: [],
    approved: [],
    merged_closed: [],
  };
  for (const pr of prs) out[classifyPr(pr)].push(pr);
  return out;
}
