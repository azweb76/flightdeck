import { Autocomplete, Box, TextField } from "@mui/material";
import { useMemo, useState, type HTMLAttributes, type Key, type ReactNode } from "react";
import { DropdownPaper, DropdownUi } from "./Dropdown.tsx";
import { catalogOptions, type RepoOption } from "./filter.ts";
import { OptionRow } from "./OptionRow.tsx";
import { pickerPopper } from "./popper.ts";
import { useRepoCatalog } from "./useRepoCatalog.ts";

export function RepoPicker(props: { value: string; onChange: (slug: string) => void }) {
  const catalog = useRepoCatalog();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const options = useMemo(() => catalogOptions(catalog.catalog, query), [catalog.catalog, query]);
  const starred = useMemo(() => new Set(catalog.catalog?.favorites ?? []), [catalog.catalog?.favorites]);
  const value = options.find((o) => o.slug === props.value) ?? (props.value ? { slug: props.value, group: "All" as const } : null);

  return (
    <DropdownUi
      value={{
        loading: catalog.loading,
        refreshing: catalog.refreshing,
        error: catalog.error,
        detail: catalog.catalog?.detail,
        empty: !catalog.loading && options.length === 0,
        onRefresh: () => void catalog.refresh(),
      }}
    >
      <Box data-testid="repo-picker" sx={open ? { pb: "220px" } : undefined}>
        <Autocomplete
          open={open}
          onOpen={() => {
            setOpen(true);
            queueMicrotask(() => document.querySelector("[data-testid=repo-picker]")?.scrollIntoView({ block: "start" }));
          }}
          onClose={() => {
            setOpen(false);
            setQuery("");
          }}
          options={options}
          value={value}
          inputValue={open && query ? query : props.value}
          onInputChange={(_, next, reason) => {
            if (reason === "input" || reason === "clear") setQuery(next);
          }}
          onChange={(_, next) => props.onChange(next?.slug ?? "")}
          filterOptions={(opts) => opts}
          groupBy={(o) => o.group}
          getOptionLabel={(o) => o.slug}
          isOptionEqualToValue={(a, b) => a.slug === b.slug}
          openOnFocus
          autoHighlight
          disablePortal
          noOptionsText=""
          slots={{ paper: DropdownPaper }}
          slotProps={{
            popper: pickerPopper,
            listbox: { sx: { maxHeight: 220, overflow: "auto" }, id: "repo-listbox" },
          }}
          renderGroup={renderGroup}
          renderOption={(li, option, state) =>
            renderRow(li, option, state.selected, starred, (slug, on) => {
              const [owner, name] = slug.split("/");
              if (owner && name) void catalog.favorite(owner, name, on);
            })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Find a repository"
              inputProps={{
                ...params.inputProps,
                "data-testid": "repo-search",
                "aria-label": "Repository",
              }}
            />
          )}
        />
      </Box>
    </DropdownUi>
  );
}

function renderGroup(params: { key: number; group: string; children?: ReactNode }) {
  const id = params.group === "Favorites" ? "repo-favorites" : params.group === "Recent" ? "repo-recent" : "repo-all";
  return (
    <li key={params.key} data-testid={id}>
      <Box component="div" sx={{ px: 1.5, pt: 1, typography: "subtitle2" }}>
        {params.group}
      </Box>
      <ul style={{ padding: 0, margin: 0 }}>{params.children}</ul>
    </li>
  );
}

function renderRow(
  li: HTMLAttributes<HTMLLIElement> & { key?: Key },
  option: RepoOption,
  selected: boolean,
  starred: Set<string>,
  onStar: (slug: string, on: boolean) => void,
) {
  const { key, ...rest } = li;
  return (
    <OptionRow
      key={key}
      {...rest}
      option={option}
      selected={selected}
      starred={starred.has(option.slug)}
      onStar={onStar}
    />
  );
}
