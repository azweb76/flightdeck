import Star from "@mui/icons-material/Star";
import StarBorder from "@mui/icons-material/StarBorder";
import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import type { CatalogRepo } from "@flightdeck/shared";
import type { CatalogSections } from "./filter.ts";

export function RepoList(props: {
  sections: CatalogSections;
  value: string;
  active: string;
  starred: Set<string>;
  onPick: (slug: string) => void;
  onStar: (slug: string, on: boolean) => void;
}) {
  return (
    <>
      <Section
        title="Favorites"
        testId="repo-favorites"
        slugs={props.sections.favorites}
        value={props.value}
        active={props.active}
        starred={props.starred}
        onPick={props.onPick}
        onStar={props.onStar}
      />
      <Section
        title="Recent"
        testId="repo-recent"
        slugs={props.sections.recent}
        value={props.value}
        active={props.active}
        starred={props.starred}
        onPick={props.onPick}
        onStar={props.onStar}
      />
      <AllRepos
        repos={props.sections.all}
        value={props.value}
        active={props.active}
        starred={props.starred}
        onPick={props.onPick}
        onStar={props.onStar}
      />
    </>
  );
}

function AllRepos(props: {
  repos: CatalogRepo[];
  value: string;
  active: string;
  starred: Set<string>;
  onPick: (slug: string) => void;
  onStar: (slug: string, on: boolean) => void;
}) {
  if (props.repos.length === 0) return null;
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        All
      </Typography>
      <Stack spacing={0.5} sx={{ maxHeight: 240, overflow: "auto" }} data-testid="repo-all">
        {props.repos.map((repo) => {
          const slug = `${repo.owner}/${repo.name}`;
          return (
            <Row
              key={slug}
              slug={slug}
              selected={props.value === slug}
              active={props.active === slug}
              starred={props.starred.has(slug)}
              onPick={props.onPick}
              onStar={props.onStar}
            />
          );
        })}
      </Stack>
    </Box>
  );
}

function Section(props: {
  title: string;
  testId: string;
  slugs: string[];
  value: string;
  active: string;
  starred: Set<string>;
  onPick: (slug: string) => void;
  onStar: (slug: string, on: boolean) => void;
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
            active={props.active === slug}
            starred={props.starred.has(slug)}
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
  active: boolean;
  starred: boolean;
  onPick: (slug: string) => void;
  onStar: (slug: string, on: boolean) => void;
}) {
  return (
    <Stack
      id={`repo-option-${props.slug}`}
      direction="row"
      alignItems="center"
      sx={{
        border: 1,
        borderColor: props.selected || props.active ? "primary.main" : "divider",
        bgcolor: props.active ? "action.hover" : "transparent",
        borderRadius: 1,
        px: 1,
      }}
    >
      <Button
        fullWidth
        role="option"
        aria-selected={props.selected}
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
        {props.starred ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
      </IconButton>
    </Stack>
  );
}
