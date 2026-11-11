import { useEffect, useState } from "react";
import { Box, Button, Heading, Text, TextInput } from "@primer/react";
import type { PrReviewSession } from "@flightdeck/shared";
import { useParams } from "react-router-dom";
import { api } from "../api/index.ts";

export function ReviewDiff() {
  const { id } = useParams();
  const [review, setReview] = useState<PrReviewSession>();
  const [edit, setEdit] = useState<Record<number, string>>({});

  useEffect(() => {
    if (id) void api.review(Number(id)).then(setReview);
  }, [id]);
  if (!review) return <Box sx={{ p: 4 }}>Loading…</Box>;

  return (
    <Box sx={{ p: [3, 4] }}>
      <Heading as="h2">
        Review {review.repoSlug} #{review.prNumber} {review.title}
      </Heading>
      <Button
        variant="primary"
        sx={{ my: 3 }}
        onClick={() => void api.submitReview(review.id).then(setReview)}
        disabled={review.status === "submitted"}
      >
        Submit review
      </Button>
      {review.files.map((f) => (
        <Box key={f.path} sx={{ border: "1px solid", borderColor: "border.default", mb: 3, borderRadius: 2 }}>
          <Box sx={{ bg: "canvas.subtle", p: 2, fontFamily: "mono" }}>{f.path}</Box>
          <Text as="pre" sx={{ p: 3, fontSize: 1 }}>
            {f.patch}
          </Text>
          {review.drafts
            .filter((d) => d.path === f.path)
            .map((d) => (
              <Box key={d.id} sx={{ m: 3, p: 3, border: "1px solid", borderColor: d.state === "pending" ? "attention.emphasis" : "border.default", borderRadius: 2 }}>
                <Text sx={{ fontSize: 0, color: "fg.muted" }}>{d.state}</Text>
                <TextInput
                  value={edit[d.id] ?? d.body}
                  onChange={(e) => setEdit((s) => ({ ...s, [d.id]: e.target.value }))}
                />
                <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                  <Button size="small" onClick={() => void api.patchDraft(review.id, d.id, "kept").then(setReview)}>Keep</Button>
                  <Button size="small" onClick={() => void api.patchDraft(review.id, d.id, "edited", edit[d.id] ?? d.body).then(setReview)}>Edit</Button>
                  <Button size="small" onClick={() => void api.patchDraft(review.id, d.id, "discarded").then(setReview)}>Discard</Button>
                </Box>
              </Box>
            ))}
        </Box>
      ))}
    </Box>
  );
}
