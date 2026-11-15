import { Button, Chip, Stack, Typography } from "@mui/material";
import type { PrReview } from "@flightdeck/shared";
import { reviewChipSx, reviewStatusColor, reviewStatusLabel } from "./reviewChips.ts";

export function ReviewHeader(props: {
  review: PrReview;
  onBack: () => void;
  onStart: () => void;
  onPost: () => void;
  onArchive: () => void;
  onResume: () => void;
}) {
  const { review } = props;
  return (
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2}>
      <Stack spacing={1}>
        <Typography variant="h4">{review.title}</Typography>
        <Typography color="text.secondary">
          {review.repoSlug}#{review.number}
          {review.author ? ` · ${review.author}` : ""}
        </Typography>
        <Stack direction="row" gap={0.75} flexWrap="wrap">
          <Chip
            size="small"
            color={reviewStatusColor(review.status, review.interrupted)}
            label={reviewStatusLabel(review.status, review.interrupted)}
            data-testid="review-detail-status"
            sx={reviewChipSx(review.status, review.interrupted)}
          />
          {review.skillPath ? <Chip size="small" variant="outlined" label={review.skillPath} data-testid="review-skill" /> : null}
        </Stack>
      </Stack>
      <Stack direction="row" gap={1} flexWrap="wrap">
        <Button variant="outlined" onClick={props.onBack}>
          All reviews
        </Button>
        {review.interrupted ? (
          <Button variant="contained" data-testid="resume-review" onClick={props.onResume}>
            Resume
          </Button>
        ) : null}
        {review.status === "selected" || review.status === "requested" || review.status === "error" ? (
          <Button variant="contained" data-testid="start-review" onClick={props.onStart}>
            Review
          </Button>
        ) : null}
        {review.status === "drafts" ? (
          <Button variant="contained" data-testid="open-post-review" onClick={props.onPost}>
            Post review
          </Button>
        ) : null}
        <Button variant="outlined" data-testid="archive-review" onClick={props.onArchive}>
          Archive
        </Button>
      </Stack>
    </Stack>
  );
}
