import { Alert, Box, Paper, Stack, Typography } from "@mui/material";
import type { PrReview } from "@flightdeck/shared";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api.ts";
import { ReviewRow } from "./ReviewRow.tsx";

export function ReviewsPage() {
  const [reviews, setReviews] = useState<PrReview[]>([]);
  const [error, setError] = useState("");

  const pull = useCallback(async () => {
    try {
      setReviews((await api.reviews()).reviews);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load reviews");
    }
  }, []);

  useEffect(() => {
    void pull();
  }, [pull]);

  return (
    <Stack spacing={3} data-testid="reviews-page">
      <Box>
        <Typography variant="h4">Reviews</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Pull requests where your review is requested. Select the ones you want to look at, then open a row and click Review.
          Nothing is posted to GitHub until you approve the draft comments.
        </Typography>
      </Box>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {reviews.length === 0 ? (
        <Paper sx={{ p: 8, textAlign: "center", border: 1, borderColor: "divider" }} data-testid="empty-reviews">
          <Typography variant="h6" gutterBottom>
            No review requests
          </Typography>
          <Typography color="text.secondary">When someone asks you to review a PR, it will show up here.</Typography>
        </Paper>
      ) : (
        <Stack spacing={1} data-testid="review-list">
          {reviews.map((review) => (
            <ReviewRow
              key={review.id}
              review={review}
              onSelect={(id) => {
                void api
                  .selectReview(id)
                  .then((next) => setReviews((cur) => cur.map((r) => (r.id === next.id ? next : r))))
                  .catch((e: Error) => setError(e.message));
              }}
              onResume={(id) => {
                void api
                  .startReview(id)
                  .then((next) => setReviews((cur) => cur.map((r) => (r.id === next.id ? next : r))))
                  .catch((e: Error) => setError(e.message));
              }}
              onArchive={(id) => {
                void api
                  .archiveReview(id)
                  .then((next) => setReviews((cur) => cur.filter((r) => r.id !== next.id)))
                  .catch((e: Error) => setError(e.message));
              }}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
