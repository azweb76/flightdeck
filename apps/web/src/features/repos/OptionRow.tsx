import Star from "@mui/icons-material/Star";
import StarBorder from "@mui/icons-material/StarBorder";
import { IconButton, Stack, Typography } from "@mui/material";
import type { HTMLAttributes, MouseEvent } from "react";
import type { RepoOption } from "./filter.ts";

export function OptionRow(
  props: {
    option: RepoOption;
    selected: boolean;
    starred: boolean;
    onStar: (slug: string, on: boolean) => void;
  } & HTMLAttributes<HTMLLIElement>,
) {
  const { option, selected, starred, onStar, ...li } = props;
  function star(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    onStar(option.slug, !starred);
  }
  return (
    <li {...li} data-testid={`repo-option-${option.slug}`}>
      <Stack direction="row" alignItems="center" width="100%" gap={1}>
        <Typography sx={{ flex: 1, fontWeight: selected ? 600 : 400 }}>{option.slug}</Typography>
        <IconButton
          aria-label={starred ? "Unfavorite" : "Favorite"}
          onMouseDown={(e) => e.preventDefault()}
          onClick={star}
          data-testid={`repo-star-${option.slug}`}
          size="small"
        >
          {starred ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
        </IconButton>
      </Stack>
    </li>
  );
}
