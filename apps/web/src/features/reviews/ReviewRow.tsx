import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import type { PrReview } from "@flightdeck/shared";
import { useNavigate } from "react-router-dom";
import { reviewChipSx, reviewStatusColor, reviewStatusLabel } from "./reviewChips.ts";

export function ReviewRow(props: { review: PrReview; onSelect: (id: string) => void }) {
  const { review } = props;
  const nav = useNavigate();
  return (
    <Paper
      sx={{ px: 2, py: 1.5, border: 1, borderColor: "divider", cursor: "pointer" }}
      data-testid={`review-row-${review.number}`}
      onClick={() => nav(`/reviews/${encodeURIComponent(review.id)}`)}
    >
      <Stack direction={{ xs: "column", md: "row" }} gap={1.5} alignItems={{ md: "center" }}>
        <Chip
          size="small"
          color={reviewStatusColor(review.status, review.interrupted)}
          label={reviewStatusLabel(review.status, review.interrupted)}
          data-testid={`review-status-${review.number}`}
          sx={reviewChipSx(review.status, review.interrupted)}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap>
            {review.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {review.repoSlug}#{review.number}
            {review.author ? ` · ${review.author}` : ""}
            {review.skillPath ? ` · ${review.skillPath}` : ""}
          </Typography>
        </Box>
        {!review.selected ? (
          <Button
            variant="outlined"
            data-testid={`select-review-${review.number}`}
            onClick={(e) => {
              e.stopPropagation();
              props.onSelect(review.id);
            }}
          >
            Select
          </Button>
        ) : null}
      </Stack>
    </Paper>
  );
}
