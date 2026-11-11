import { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import type { PrReviewSession } from "@flightdeck/shared";
import { useParams } from "react-router-dom";
import { api } from "../api/index.ts";
import { ColoredDiff } from "../runs/ColoredDiff.tsx";
import { MarkdownEditor } from "../../ui/components/markdown/index.ts";

export function ReviewDiff() {
  const { id } = useParams();
  const [review, setReview] = useState<PrReviewSession>();
  const [error, setError] = useState<string>();
  const [edit, setEdit] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!id) return;
    void api
      .review(Number(id))
      .then((r) => {
        setReview(r);
        setError(undefined);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Review not found"));
  }, [id]);
  if (error) return <Alert severity="error" sx={{ m: 4 }}>{error}</Alert>;
  if (!review) {
    return (
      <Box sx={{ p: 4 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h2">
        Review {review.repoSlug} #{review.prNumber} {review.title}
      </Typography>
      <Button
        variant="contained"
        sx={{ my: 3 }}
        onClick={() => void api.submitReview(review.id).then(setReview)}
        disabled={review.status === "submitted"}
      >
        Submit review
      </Button>
      {review.files.map((f) => (
        <FileBlock key={f.path} review={review} file={f} edit={edit} setEdit={setEdit} setReview={setReview} />
      ))}
    </Box>
  );
}

function FileBlock({
  review,
  file,
  edit,
  setEdit,
  setReview,
}: {
  review: PrReviewSession;
  file: PrReviewSession["files"][number];
  edit: Record<number, string>;
  setEdit: (fn: (s: Record<number, string>) => Record<number, string>) => void;
  setReview: (r: PrReviewSession) => void;
}) {
  return (
    <Box sx={{ border: "1px solid", borderColor: "divider", mb: 3, borderRadius: 1 }}>
      <Box sx={{ bgcolor: "background.default", p: 2, fontFamily: "ui-monospace, monospace" }}>{file.path}</Box>
      <ColoredDiff diff={file.patch} />
      {review.drafts
        .filter((d) => d.path === file.path)
        .map((d) => (
          <Box
            key={d.id}
            sx={{
              m: 3,
              p: 3,
              border: "1px solid",
              borderColor: d.state === "pending" ? "warning.main" : "divider",
              borderRadius: 1,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {d.state}
            </Typography>
            <MarkdownEditor
              id={`review-draft-${d.id}`}
              value={edit[d.id] ?? d.body}
              onChange={(next) => setEdit((s) => ({ ...s, [d.id]: next }))}
              minRows={4}
            />
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button size="small" onClick={() => void api.patchDraft(review.id, d.id, "kept").then(setReview)}>
                Keep
              </Button>
              <Button
                size="small"
                onClick={() => void api.patchDraft(review.id, d.id, "edited", edit[d.id] ?? d.body).then(setReview)}
              >
                Edit
              </Button>
              <Button size="small" onClick={() => void api.patchDraft(review.id, d.id, "discarded").then(setReview)}>
                Discard
              </Button>
            </Stack>
          </Box>
        ))}
    </Box>
  );
}
