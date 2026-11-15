import { Box, Button, IconButton, Stack, TextField, Typography } from "@mui/material";
import type { CatalogView } from "@flightdeck/shared";
import { useMemo, useState } from "react";
import { api } from "../api.ts";

export function RepoPicker(props: {
  catalog: CatalogView | undefined;
  value: string;
  onChange: (slug: string) => void;
  onCatalog: (next: CatalogView) => void;
}) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const repos = props.catalog?.repos ?? [];
    return q ? repos.filter((r) => `${r.owner}/${r.name}`.toLowerCase().includes(q)) : repos;
  }, [props.catalog?.repos, q]);
  const favorites = (props.catalog?.favorites ?? []).filter((slug) => !q || slug.toLowerCase().includes(q));
  const recent = (props.catalog?.recent ?? []).filter((slug) => !q || slug.toLowerCase().includes(q));

  async function refresh() {
    setBusy(true);
    try {
      props.onCatalog(await api.repos(true));
    } finally {
      setBusy(false);
    }
  }

  async function star(slug: string, on: boolean) {
    const [owner, name] = slug.split("/");
    if (!owner || !name) return;
    props.onCatalog(await api.favoriteRepo(owner, name, on));
  }

  return (
    <Stack spacing={1.5} data-testid="repo-picker">
      <Stack direction="row" gap={1} alignItems="flex-start">
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search repositories"
          inputProps={{ "data-testid": "repo-search" }}
        />
        <Button onClick={() => void refresh()} disabled={busy} data-testid="repo-refresh">
          Refresh
        </Button>
      </Stack>
      {props.catalog?.detail ? (
        <Typography color="text.secondary" data-testid="repo-picker-detail">
          {props.catalog.detail}
        </Typography>
      ) : null}
      <Section title="Favorites" testId="repo-favorites" slugs={favorites} value={props.value} onPick={props.onChange} onStar={star} starred />
      <Section title="Recent" testId="repo-recent" slugs={recent} value={props.value} onPick={props.onChange} onStar={star} starred={false} favorites={props.catalog?.favorites} />
      <Typography variant="subtitle2">All</Typography>
      <Stack spacing={0.5} sx={{ maxHeight: 240, overflow: "auto" }} data-testid="repo-all">
        {filtered.map((r) => {
          const slug = `${r.owner}/${r.name}`;
          return (
            <Row
              key={slug}
              slug={slug}
              selected={props.value === slug}
              starred={Boolean(props.catalog?.favorites.includes(slug))}
              onPick={props.onChange}
              onStar={star}
            />
          );
        })}
        {filtered.length === 0 && !props.catalog?.detail ? (
          <Typography color="text.secondary">No matching repositories.</Typography>
        ) : null}
      </Stack>
    </Stack>
  );
}

function Section(props: {
  title: string;
  testId: string;
  slugs: string[];
  value: string;
  onPick: (slug: string) => void;
  onStar: (slug: string, on: boolean) => void;
  starred: boolean;
  favorites?: string[];
}) {
  if (props.slugs.length === 0) return null;
  return (
    <Box data-testid={props.testId}>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        {props.title}
      </Typography>
      <Stack spacing={0.5}>
        {props.slugs.map((slug) => (
          <Row
            key={slug}
            slug={slug}
            selected={props.value === slug}
            starred={props.starred || Boolean(props.favorites?.includes(slug))}
            onPick={props.onPick}
            onStar={props.onStar}
          />
        ))}
      </Stack>
    </Box>
  );
}

function Row(props: {
  slug: string;
  selected: boolean;
  starred: boolean;
  onPick: (slug: string) => void;
  onStar: (slug: string, on: boolean) => void;
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      sx={{
        border: 1,
        borderColor: props.selected ? "primary.main" : "divider",
        borderRadius: 1,
        px: 1,
      }}
    >
      <Button
        fullWidth
        onClick={() => props.onPick(props.slug)}
        data-testid={`repo-option-${props.slug}`}
        sx={{ justifyContent: "flex-start", color: "text.primary" }}
      >
        {props.slug}
      </Button>
      <IconButton
        aria-label={props.starred ? "Unfavorite" : "Favorite"}
        onClick={() => props.onStar(props.slug, !props.starred)}
        data-testid={`repo-star-${props.slug}`}
        size="small"
      >
        {props.starred ? "★" : "☆"}
      </IconButton>
    </Stack>
  );
}
