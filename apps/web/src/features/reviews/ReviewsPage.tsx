import { useEffect, useState } from "react";
import { Box, Button, Heading, Text } from "@primer/react";
import type { PrReviewSession } from "@flightdeck/shared";
import { Link } from "react-router-dom";
import { api } from "../api/index.ts";

export function ReviewsPage() {
  const [reviews, setReviews] = useState<PrReviewSession[]>([]);
  useEffect(() => {
    void api.reviews().then((r) => setReviews(r.reviews));
  }, []);
  return (
    <Box sx={{ p: [3, 4] }}>
      <Heading as="h2">Reviews</Heading>
      <Button sx={{ mt: 2 }} onClick={() => void api.createReview().then((s) => setReviews((r) => [s, ...r]))}>
        Draft review of a teammate PR
      </Button>
      <Box sx={{ mt: 3, display: "grid", gap: 2 }}>
        {reviews.map((r) => (
          <Box key={r.id} sx={{ border: "1px solid", borderColor: "border.default", p: 3, borderRadius: 2 }}>
            <Link to={`/reviews/${r.id}`}>
              {r.repoSlug} #{r.prNumber} {r.title}
            </Link>
            <Text sx={{ display: "block", color: "fg.muted", fontSize: 1 }}>{r.status}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
