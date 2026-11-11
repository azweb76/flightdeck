import { Autocomplete, Box, IconButton, Stack, TextField } from "@mui/material";
import { useMemo, useState } from "react";
import {
  flattenRanked,
  rankRepos,
  slugOf,
  type CatalogRepo,
  type FlatPickerItem,
  type RankedGroup,
} from "@flightdeck/shared";
import { RefreshIcon } from "../../../features/ui/icons.tsx";
import { VirtualListbox } from "./listbox.tsx";
import { OptionRow } from "./option-row.tsx";

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

type Item = FlatPickerItem<CatalogRepo>;

export function RepoPicker(props: RepoPickerProps) {
  const [query, setQuery] = useState("");
  const options = useMemo(() => {
    const source = props.filter ? props.repos.filter(props.filter) : props.repos;
    return flattenRanked(rankRepos(source, query));
  }, [props.repos, props.filter, query]);
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", width: "100%" }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Autocomplete
          multiple={props.multiple}
          autoHighlight
          options={options}
          getOptionLabel={(o) => (o.kind === "row" ? slugOf(o.repo) : GROUP_LABEL[o.group])}
          getOptionDisabled={(o) => o.kind === "header"}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          filterOptions={(rows) => rows}
          value={selected(options, props.value, props.multiple)}
          inputValue={query}
          onInputChange={(_, next, reason) => {
            if (reason !== "reset") setQuery(next);
          }}
          onChange={(_, next) => emitChange(props, next)}
          slots={{ listbox: VirtualListbox }}
          slotProps={{ popper: { placement: "bottom-start", sx: { width: 420 } } }}
          renderInput={(params) => (
            <TextField {...params} autoFocus={props.autoFocus} placeholder={props.placeholder ?? "Search repos"} />
          )}
          renderOption={(li, option) =>
            option.kind === "header" ? (
              <Box
                component="li"
                {...li}
                key={option.id}
                onMouseDown={(e) => e.preventDefault()}
                sx={{ fontSize: 11, fontWeight: 600, color: "text.secondary", letterSpacing: 0.4, minHeight: 44 }}
              >
                {GROUP_LABEL[option.group]}
              </Box>
            ) : (
              <OptionRow key={option.id} li={li} repo={option.repo} onToggleFavorite={props.onToggleFavorite} />
            )
          }
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

function emitChange(props: RepoPickerProps, next: Item | Item[] | null) {
  const rows = (Array.isArray(next) ? next : next ? [next] : []).filter((i): i is Item & { kind: "row" } => i.kind === "row");
  if (props.multiple) {
    props.onChange(rows.map((row) => row.repo));
    return;
  }
  props.onChange(rows[0]?.repo ?? null);
}

function selected(options: Item[], value: CatalogRepo | CatalogRepo[] | null, multiple?: boolean): Item | Item[] | null {
  const asItem = (repo: CatalogRepo): Item =>
    options.find((o) => o.kind === "row" && slugOf(o.repo) === slugOf(repo)) ?? {
      kind: "row",
      group: "all",
      id: slugOf(repo),
      repo,
      score: 0,
    };
  if (multiple) return Array.isArray(value) ? value.map(asItem) : [];
  if (!value || Array.isArray(value)) return null;
  return asItem(value);
}
