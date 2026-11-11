import { Autocomplete, Box, Chip, IconButton, Stack, TextField, Typography } from "@mui/material";
import { useMemo, useState, type HTMLAttributes } from "react";
import { isPushable, rankRepos, slugOf, type CatalogRepo, type RankedGroup, type RankedRepo } from "@flightdeck/shared";
import { RefreshIcon, StarIcon } from "../../../features/ui/icons.tsx";
import { VirtualListbox } from "./listbox.tsx";

const GROUP_LABEL: Record<RankedGroup, string> = {
  favorites: "Favorites",
  recent: "Recent",
  all: "All",
};

export type RepoPickerProps = {
  repos: CatalogRepo[];
  value: CatalogRepo | CatalogRepo[] | null;
  onChange: (value: CatalogRepo | CatalogRepo[] | null) => void;
  multiple?: boolean;
  filter?: (repo: CatalogRepo) => boolean;
  placeholder?: string;
  autoFocus?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  onToggleFavorite?: (repo: CatalogRepo) => void;
};

export function RepoPicker(props: RepoPickerProps) {
  const [query, setQuery] = useState("");
  const options = useMemo(() => {
    const source = props.filter ? props.repos.filter(props.filter) : props.repos;
    return rankRepos(source, query);
  }, [props.repos, props.filter, query]);
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", width: "100%" }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Autocomplete
          multiple={props.multiple}
          autoHighlight
          options={options}
          groupBy={(o) => GROUP_LABEL[o.group]}
          getOptionLabel={(o) => slugOf(o.repo)}
          isOptionEqualToValue={(a, b) => slugOf(a.repo) === slugOf(b.repo)}
          filterOptions={(rows) => rows}
          value={selected(options, props.value, props.multiple)}
          inputValue={query}
          onInputChange={(_, next, reason) => {
            if (reason !== "reset") setQuery(next);
          }}
          onChange={(_, next) => emitChange(props, next)}
          slotProps={{ listbox: { component: VirtualListbox, sx: { p: 0 } } }}
          renderInput={(params) => (
            <TextField {...params} autoFocus={props.autoFocus} placeholder={props.placeholder ?? "Search repos"} />
          )}
          renderOption={(li, option) => (
            <OptionRow key={slugOf(option.repo)} li={li} option={option} onToggleFavorite={props.onToggleFavorite} />
          )}
        />
      </Box>
      {props.onRefresh ? (
        <IconButton size="small" aria-label="Refresh" disabled={props.refreshing} onClick={() => props.onRefresh?.()}>
          <RefreshIcon />
        </IconButton>
      ) : null}
    </Stack>
  );
}

function emitChange(
  props: RepoPickerProps,
  next: RankedRepo<CatalogRepo> | RankedRepo<CatalogRepo>[] | null,
) {
  if (props.multiple) {
    props.onChange(((next as RankedRepo<CatalogRepo>[]) ?? []).map((row) => row.repo));
    return;
  }
  props.onChange((next as RankedRepo<CatalogRepo> | null)?.repo ?? null);
}

function selected(
  options: RankedRepo<CatalogRepo>[],
  value: CatalogRepo | CatalogRepo[] | null,
  multiple?: boolean,
): RankedRepo<CatalogRepo> | RankedRepo<CatalogRepo>[] | null {
  const asOption = (repo: CatalogRepo) =>
    options.find((o) => slugOf(o.repo) === slugOf(repo)) ?? { repo, group: "all" as const, score: 0 };
  if (multiple) return Array.isArray(value) ? value.map(asOption) : [];
  if (!value || Array.isArray(value)) return null;
  return asOption(value);
}

function OptionRow({
  li,
  option,
  onToggleFavorite,
}: {
  li: HTMLAttributes<HTMLLIElement>;
  option: RankedRepo<CatalogRepo>;
  onToggleFavorite?: (repo: CatalogRepo) => void;
}) {
  return (
    <Box component="li" {...li} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>
          {slugOf(option.repo)}
        </Typography>
        {option.repo.description ? (
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
            {option.repo.description}
          </Typography>
        ) : null}
      </Box>
      {option.repo.private ? <Chip label="private" size="small" /> : null}
      {!isPushable(option.repo.permission) ? <Chip label="read-only" size="small" /> : null}
      <IconButton
        size="small"
        aria-label={option.repo.favorite ? "Unstar" : "Star"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleFavorite?.(option.repo);
        }}
      >
        <StarIcon filled={option.repo.favorite} />
      </IconButton>
    </Box>
  );
}
