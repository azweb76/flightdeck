import { Alert, Box, CircularProgress, Tab, Tabs, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { BoardPr } from "@flightdeck/shared";
import { filterPrs, readStoredFilters, writeStoredFilters, type PrFilters } from "./filter.ts";
import { PrBoard } from "./PrBoard.tsx";
import { PrBoardFilters } from "./PrFilters.tsx";
import { PrDrawer } from "./PrDrawer.tsx";
import { usePrs } from "./usePrs.ts";

export function PrsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "review" ? "review" : "mine";
  const { prs } = usePrs();
  const [filters, setFilters] = useState<PrFilters>(() => readStoredFilters(tab));
  const [open, setOpen] = useState<BoardPr>();

  useEffect(() => {
    setFilters(readStoredFilters(tab));
  }, [tab]);

  const shown = useMemo(() => filterPrs(prs ?? [], tab, filters), [prs, tab, filters]);

  function changeFilters(next: PrFilters) {
    setFilters(next);
    writeStoredFilters(tab, next);
  }

  return (
    <Box sx={{ p: 3, minHeight: "100%" }}>
      <Typography variant="h2" sx={{ mb: 2 }}>
        Pull requests
      </Typography>
      <Tabs
        value={tab}
        onChange={(_, next) => {
          const p = new URLSearchParams(params);
          if (next === "mine") p.delete("tab");
          else p.set("tab", next);
          setParams(p);
        }}
        sx={{ mb: 2 }}
      >
        <Tab value="mine" label="Mine" />
        <Tab value="review" label="Review requests" />
      </Tabs>
      <PrBoardFilters filters={filters} onChange={changeFilters} />
      {!prs ? (
        <CircularProgress size={20} />
      ) : shown.length === 0 ? (
        <Alert severity="info">No pull requests in this tab.</Alert>
      ) : (
        <PrBoard prs={shown} tab={tab} onOpen={setOpen} />
      )}
      <PrDrawer pr={open} onClose={() => setOpen(undefined)} />
    </Box>
  );
}
