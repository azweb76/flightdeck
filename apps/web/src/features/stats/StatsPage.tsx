import { useEffect, useState } from "react";
import { Box, Card, CardContent, Grid, LinearProgress, Typography } from "@mui/material";
import { api, type StatsPayload } from "../api/index.ts";
import { ImprovementsInbox } from "./ImprovementsInbox.tsx";

export function StatsPage() {
  const [stats, setStats] = useState<StatsPayload>();
  useEffect(() => {
    void api.stats().then(setStats);
  }, []);
  if (!stats) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography>Loading stats…</Typography>
      </Box>
    );
  }
  const tiles: [string, string][] = [
    [`$${stats.spendUsd.toFixed(2)}`, "Spend"],
    [String(stats.prsMerged), "PRs completed"],
    [String(stats.avgRounds), "Avg rounds"],
    [stats.avgTimeToPrMs ? `${Math.round(stats.avgTimeToPrMs / 60000)} min` : "—", "Avg time to PR"],
  ];
  const max = Math.max(1, ...stats.costByRepo.map((r) => r.usd));
  const dayMax = Math.max(1, ...(stats.costByDay ?? []).map((d) => d.usd));
  return (
    <Box sx={{ p: 4, minHeight: "100%" }}>
      <Typography variant="h2">Stats</Typography>
      <Grid container spacing={3} sx={{ my: 3 }}>
        {tiles.map(([v, l]) => (
          <Grid key={l} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography sx={{ fontSize: 20, fontWeight: 600 }}>{v}</Typography>
                <Typography color="text.secondary">{l}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Typography variant="h3" sx={{ mb: 2 }}>
        Spend by day
      </Typography>
      {(stats.costByDay ?? []).map((d) => (
        <BarRow key={d.day} label={d.day} value={d.usd} max={dayMax} />
      ))}
      <Typography variant="h3" sx={{ mt: 4, mb: 2 }}>
        Cost by repo
      </Typography>
      {stats.costByRepo.map((r) => (
        <BarRow key={r.repo} label={r.repo} value={r.usd} max={max} />
      ))}
      <ImprovementsInbox />
    </Box>
  );
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2, my: 2 }}>
      <Typography sx={{ width: 140, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>{label}</Typography>
      <LinearProgress variant="determinate" value={(value / max) * 100} sx={{ flex: 1, height: 8, borderRadius: 1 }} />
      <Typography>${value.toFixed(2)}</Typography>
    </Box>
  );
}
