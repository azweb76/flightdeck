import { Button, Stack, TextField, Typography } from "@mui/material";
import { useMemo, useState, type KeyboardEvent } from "react";
import { filterCatalog, nextActive } from "./filter.ts";
import { RepoList } from "./RepoList.tsx";
import { useRepoCatalog } from "./useRepoCatalog.ts";

export function RepoPicker(props: { value: string; onChange: (slug: string) => void }) {
  const catalog = useRepoCatalog();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(props.value);
  const sections = useMemo(() => filterCatalog(catalog.catalog, query), [catalog.catalog, query]);
  const starred = useMemo(() => new Set(catalog.catalog?.favorites ?? []), [catalog.catalog?.favorites]);

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((cur) => nextActive(sections.slugs, cur || props.value, 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((cur) => nextActive(sections.slugs, cur || props.value, -1));
    } else if (event.key === "Enter") {
      const slug = active || sections.slugs[0];
      if (slug) {
        event.preventDefault();
        props.onChange(slug);
      }
    }
  }

  return (
    <Stack spacing={1.5} data-testid="repo-picker" onKeyDown={onKeyDown}>
      <Stack direction="row" gap={1} alignItems="flex-start">
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search repositories"
          inputProps={{ "data-testid": "repo-search", role: "combobox", "aria-expanded": true }}
        />
        <Button onClick={() => void catalog.refresh()} disabled={catalog.refreshing} data-testid="repo-refresh">
          Refresh
        </Button>
      </Stack>
      <PickerStatus
        loading={catalog.loading}
        error={catalog.error}
        detail={catalog.catalog?.detail}
        empty={!catalog.loading && sections.slugs.length === 0}
      />
      <RepoList
        sections={sections}
        value={props.value}
        active={active || props.value}
        starred={starred}
        onPick={props.onChange}
        onStar={(slug, on) => {
          const [owner, name] = slug.split("/");
          if (owner && name) void catalog.favorite(owner, name, on);
        }}
      />
    </Stack>
  );
}

function PickerStatus(props: { loading: boolean; error?: string; detail?: string; empty: boolean }) {
  if (props.loading) {
    return (
      <Typography color="text.secondary" data-testid="repo-picker-loading">
        Loading repositories…
      </Typography>
    );
  }
  if (props.error) {
    return (
      <Typography color="error" data-testid="repo-picker-error">
        {props.error}
      </Typography>
    );
  }
  if (props.detail) {
    return (
      <Typography color="text.secondary" data-testid="repo-picker-detail">
        {props.detail}
      </Typography>
    );
  }
  if (props.empty) {
    return (
      <Typography color="text.secondary" data-testid="repo-picker-empty">
        No matching repositories.
      </Typography>
    );
  }
  return null;
}
