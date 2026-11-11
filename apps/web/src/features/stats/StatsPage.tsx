import { useEffect, useState } from "react";
import { Box, Heading, Text } from "@primer/react";
import { api, type StatsPayload } from "../api/index.ts";
import { ImprovementsInbox } from "./ImprovementsInbox.tsx";

export function StatsPage() {
  const [stats, setStats] = useState<StatsPayload>();
  useEffect(() => {
    void api.stats().then(setStats);
  }, []);
  if (!stats) return <Box sx={{ p: 4 }}>Loading…</Box>;
  const tiles: [string, string][] = [
    [`$${stats.spendUsd.toFixed(2)}`, "Spend"],
    [String(stats.prsMerged), "PRs completed"],
    [String(stats.avgRounds), "Avg rounds"],
    [stats.avgTimeToPrMs ? `${Math.round(stats.avgTimeToPrMs / 60000)} min` : "—", "Avg time to PR"],
  ];
  const max = Math.max(1, ...stats.costByRepo.map((r) => r.usd));
  return (
    <Box sx={{ p: [3, 4] }}>
      <Heading as="h2">Stats</Heading>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 3, my: 3 }}>
        {tiles.map(([v, l]) => (
          <Box key={l} sx={{ border: "1px solid", borderColor: "border.default", p: 3, borderRadius: 2 }}>
            <Text sx={{ fontSize: 4, fontWeight: 600, display: "block" }}>{v}</Text>
            <Text sx={{ color: "fg.muted" }}>{l}</Text>
          </Box>
        ))}
      </Box>
      <Heading as="h3" sx={{ fontSize: 2 }}>Cost by repo</Heading>
      {stats.costByRepo.map((r) => (
        <Box key={r.repo} sx={{ display: "flex", alignItems: "center", gap: 2, my: 2 }}>
          <Text sx={{ width: 140, fontFamily: "mono", fontSize: 1 }}>{r.repo}</Text>
          <Box sx={{ height: 12, bg: "accent.emphasis", width: `${(r.usd / max) * 60}%`, borderRadius: 1 }} />
          <Text>${r.usd.toFixed(2)}</Text>
        </Box>
      ))}
      <ImprovementsInbox />
    </Box>
  );
}
