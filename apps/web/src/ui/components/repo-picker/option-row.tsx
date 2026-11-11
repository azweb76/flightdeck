import { Box, Chip, IconButton, Typography } from "@mui/material";
import type { HTMLAttributes } from "react";
import { isPushable, slugOf, type CatalogRepo } from "@flightdeck/shared";
import { StarIcon } from "../../../features/ui/icons.tsx";

export function OptionRow({
  li,
  repo,
  onToggleFavorite,
}: {
  li: HTMLAttributes<HTMLLIElement>;
  repo: CatalogRepo;
  onToggleFavorite?: (repo: CatalogRepo) => void;
}) {
  return (
    <Box component="li" {...li} sx={{ display: "flex", alignItems: "center", gap: 1, minHeight: 44, py: 0.5 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>
          {slugOf(repo)}
        </Typography>
        {repo.description ? (
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
            {repo.description}
          </Typography>
        ) : null}
      </Box>
      {repo.private ? <Chip label="private" size="small" /> : null}
      {!isPushable(repo.permission) ? <Chip label="read-only" size="small" /> : null}
      <IconButton
        size="small"
        aria-label={repo.favorite ? "Unstar" : "Star"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleFavorite?.(repo);
        }}
      >
        <StarIcon filled={repo.favorite} />
      </IconButton>
    </Box>
  );
}
