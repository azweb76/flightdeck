import { Box, Chip, Stack } from "@mui/material";
import type { CatalogRepo } from "@flightdeck/shared";
import { slugOf } from "@flightdeck/shared";
import { RepoPicker } from "../../ui/components/repo-picker/index.ts";
import { useCatalog } from "../repos/index.ts";

export function BoardFilters({
  source,
  repo,
  params,
  setSource,
  setParams,
}: {
  source: string;
  repo?: string;
  params: URLSearchParams;
  setSource: (next: string) => void;
  setParams: (p: URLSearchParams) => void;
}) {
  const catalog = useCatalog();
  const selected = catalog.repos.find((r) => slugOf(r) === repo) ?? null;
  return (
    <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", alignItems: "center" }}>
      {(["all", "jira", "github"] as const).map((s) => (
        <Chip
          key={s}
          clickable
          variant="outlined"
          color={source === s ? "primary" : "default"}
          label={s === "all" ? "All sources" : s === "jira" ? "Jira" : "GitHub"}
          onClick={() => setSource(s)}
        />
      ))}
      <Box sx={{ minWidth: 280, flex: 1 }}>
        <RepoPicker
          repos={catalog.repos}
          value={selected}
          placeholder="All repos"
          onRefresh={() => void catalog.load(true)}
          refreshing={catalog.refreshing}
          onToggleFavorite={(r) => void catalog.toggleFavorite(r)}
          onChange={(next) => {
            const p = new URLSearchParams(params);
            const picked = next as CatalogRepo | null;
            if (!picked) p.delete("repo");
            else p.set("repo", slugOf(picked));
            setParams(p);
          }}
        />
      </Box>
    </Stack>
  );
}
