import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import type { AppEvent, PrReview } from "@flightdeck/shared";
import { useCallback, useEffect, useState } from "react";
<<<<<<< HEAD:apps/web/src/features/reviews/ReviewsPage.tsx
import { api } from "../../api.ts";
import { useAppEvents } from "../../useAppEvents.ts";
import { ReviewRow } from "./ReviewRow.tsx";

export function ReviewsPage() {
  const [reviews, setReviews] = useState<PrReview[]>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  const pull = useCallback(async (fresh = false) => {
    try {
      const body = fresh ? await api.refreshReviews() : await api.reviews();
      setReviews(body.reviews);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load reviews");
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void pull();
  }, [pull]);
  useAppEvents(
    useCallback(
      (ev: AppEvent) => {
        if (ev.type === "review.updated") void pull();
      },
      [pull],
    ),
  );

  return (
    <Stack spacing={3} data-testid="reviews-page">
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4">Reviews</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Pull requests where your review is requested. Select the ones you want to look at, then open a row and click
            Review. Nothing is posted to GitHub until you approve the draft comments.
          </Typography>
        </Box>
        <Button variant="outlined" onClick={() => void pull(true)} data-testid="refresh-reviews">
          Refresh
        </Button>
      </Stack>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {!ready ? (
        <Typography color="text.secondary" data-testid="reviews-loading">
          Loading…
        </Typography>
      ) : reviews.length === 0 ? (
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
