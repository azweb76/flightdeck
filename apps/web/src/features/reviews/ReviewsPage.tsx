import { useEffect, useState } from "react";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import type { PrReviewSession } from "@flightdeck/shared";
import { Link } from "react-router-dom";
import { api } from "../api/index.ts";

export function ReviewsPage() {
  const [reviews, setReviews] = useState<PrReviewSession[]>([]);
  const [slug, setSlug] = useState("acme/web");
  const [num, setNum] = useState("431");
  useEffect(() => {
    void api.reviews().then((r) => setReviews(r.reviews));
  }, []);
  return (
    <Box sx={{ p: 4, minHeight: "100%" }}>
      <Typography variant="h2">Reviews</Typography>
      <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
        <TextField size="small" label="owner/repo" value={slug} onChange={(e) => setSlug(e.target.value)} />
        <TextField size="small" label="PR number" value={num} onChange={(e) => setNum(e.target.value)} />
        <Button
          variant="contained"
          onClick={() => void api.createReview(slug, Number(num)).then((s) => setReviews((r) => [s, ...r]))}
        >
          Draft review
        </Button>
      </Stack>
      <Stack spacing={2} sx={{ mt: 3 }}>
        {reviews.map((r) => (
          <Box key={r.id} sx={{ border: "1px solid", borderColor: "divider", p: 3, borderRadius: 1, bgcolor: "background.paper" }}>
            <Link to={`/reviews/${r.id}`}>
              {r.repoSlug} #{r.prNumber} {r.title}
            </Link>
            <Typography color="text.secondary">{r.status}</Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
