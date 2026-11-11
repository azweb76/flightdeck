import { Box, Chip, Stack } from "@mui/material";
import type { CatalogRepo, PrCi, PrReviewState } from "@flightdeck/shared";
import { slugOf } from "@flightdeck/shared";
import { RepoPicker } from "../../ui/components/repo-picker/index.ts";
import { useCatalog } from "../repos/index.ts";
import type { PrFilters } from "./filter.ts";

export function PrBoardFilters({
  filters,
  onChange,
}: {
  filters: PrFilters;
  onChange: (next: PrFilters) => void;
}) {
  const catalog = useCatalog();
  const selected = catalog.repos.find((r) => slugOf(r) === filters.repo) ?? null;
  return (
    <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", alignItems: "center" }}>
      <Box sx={{ minWidth: 280, flex: 1 }}>
        <RepoPicker
          repos={catalog.repos}
          value={selected}
          placeholder="All repos"
          onRefresh={() => void catalog.load(true)}
          refreshing={catalog.refreshing}
          onToggleFavorite={(r) => void catalog.toggleFavorite(r)}
          onChange={(next) => {
            const picked = next as CatalogRepo | null;
            onChange({ ...filters, repo: picked ? slugOf(picked) : undefined });
          }}
        />
      </Box>
      {chipRow<PrCi>(["passing", "failing", "pending"], filters.ci, (ci) => onChange({ ...filters, ci }), (v) => `CI ${v}`)}
      {chipRow<PrReviewState>(
        ["approved", "changes_requested", "pending"],
        filters.review,
        (review) => onChange({ ...filters, review }),
        (v) => v.replace("_", " "),
      )}
      {chipRow<"yes" | "no">(["yes", "no"], filters.draft, (draft) => onChange({ ...filters, draft }), (v) => (v === "yes" ? "Draft" : "Not draft"))}
    </Stack>
  );
}

function chipRow<T extends string>(
  values: T[],
  current: T | undefined,
  set: (v: T | undefined) => void,
  label: (v: T) => string,
) {
  return values.map((v) => (
    <Chip
      key={v}
      clickable
      size="small"
      variant="outlined"
      color={current === v ? "primary" : "default"}
      label={label(v)}
      onClick={() => set(current === v ? undefined : v)}
    />
  ));
}
