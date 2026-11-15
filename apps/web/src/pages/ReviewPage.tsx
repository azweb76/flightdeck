import { Alert, Box, Button, Chip, Container, Link, Stack, Typography } from "@mui/material";
import type { AppEvent, PrReview, ReviewVerdict } from "@flightdeck/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api.ts";
import { Chat, fromMessages } from "../features/chat/index.ts";
import { Markdown } from "../features/markdown/index.ts";
import { useAppEvents } from "../useAppEvents.ts";
import { ContrastAlert } from "../ui/ContrastAlert.tsx";
import { DraftComments } from "./DraftComments.tsx";
import { PostReviewDialog } from "./PostReviewDialog.tsx";
import { reviewChipSx, reviewStatusColor, reviewStatusLabel } from "./reviewChips.ts";

export function ReviewPage() {
  const { id } = useParams();
  const decoded = id ? decodeURIComponent(id) : "";
  const nav = useNavigate();
  const state = useReview(decoded);

  if (!state.review) {
    return state.error ? <Alert severity="error">{state.error}</Alert> : <Typography color="text.secondary">Loading…</Typography>;
  }

  const review = state.review;
  const approved = review.comments.filter((c) => c.state === "approved").length;
  return (
    <Container maxWidth="lg" sx={{ py: 5, px: { xs: 3, md: 4 }, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }} data-testid="review-page">
      <Stack spacing={3} sx={{ flex: 1, minHeight: 0 }}>
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
            <Button variant="outlined" onClick={() => nav("/reviews")}>
              All reviews
            </Button>
            {review.status === "selected" || review.status === "requested" || review.status === "error" ? (
              <Button variant="contained" data-testid="start-review" onClick={() => void state.start()}>
                Review
              </Button>
            ) : null}
            {review.status === "drafts" ? (
              <Button variant="contained" data-testid="open-post-review" onClick={() => state.setPostOpen(true)}>
                Post review
              </Button>
            ) : null}
            <Button variant="outlined" data-testid="archive-review" onClick={() => void state.archive()}>
              Archive
            </Button>
          </Stack>
        </Stack>
        {state.error ? <Alert severity="error">{state.error}</Alert> : null}
        {review.status === "queued" ? (
          <ContrastAlert severity="info" data-testid="review-queued">
            Waiting for a free agent slot. This starts automatically when another run finishes, is archived, or starts watching CI.
          </ContrastAlert>
        ) : null}
        <Link href={review.url} target="_blank" rel="noreferrer" data-testid="review-github-link">
          Open on GitHub
        </Link>
        {review.summary ? (
          <Box data-testid="review-summary">
            <Typography variant="h6" sx={{ mb: 1 }}>
              Summary
            </Typography>
            <Markdown>{review.summary}</Markdown>
          </Box>
        ) : null}
        {review.status === "drafts" || review.status === "posted" ? (
          <DraftComments
            review={review}
            onPatch={(commentId, patch) => void state.patch(commentId, patch)}
          />
        ) : null}
        <Chat
          title="PR chat"
          testId="review-chat"
          entries={fromMessages(review.messages)}
          reply={state.reply}
          onReply={state.setReply}
          onSend={(text) => void state.chat(text)}
          canSend={!state.busy && state.reply.trim().length > 0}
          disabled={state.busy || review.status === "archived"}
          placeholder="Ask Claude about this PR"
          inputTestId="review-reply"
          sendTestId="review-send"
          compact
          autoScroll
          paperSx={{ flex: 1, minHeight: { xs: 360, lg: 0 } }}
        />
      </Stack>
      <PostReviewDialog
        open={state.postOpen}
        event={state.event}
        approvedCount={approved}
        busy={state.busy}
        onEvent={state.setEvent}
        onClose={() => state.setPostOpen(false)}
        onPost={() => void state.post()}
      />
    </Container>
  );
}

function useReview(id: string) {
  const [review, setReview] = useState<PrReview>();
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const [event, setEvent] = useState<ReviewVerdict>("COMMENT");
  const sending = useRef(false);

  useEffect(() => {
    if (!id) return;
    api.getReview(id).then(setReview).catch((e: Error) => setError(e.message));
  }, [id]);

  useAppEvents(
    useCallback(
      (ev: AppEvent) => {
        if (!id || ev.type !== "review.updated") return;
        const payload = ev.payload as { id?: string; review?: PrReview } | undefined;
        if (payload?.review?.id === id) setReview(payload.review);
      },
      [id],
    ),
  );

  async function wrap(fn: () => Promise<PrReview>): Promise<void> {
    setBusy(true);
    setError("");
    try {
      setReview(await fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return {
    review,
    error,
    reply,
    busy,
    postOpen,
    event,
    setReply,
    setPostOpen,
    setEvent,
    start: () => wrap(() => api.startReview(id)),
    archive: () => wrap(() => api.archiveReview(id)),
    patch: (commentId: string, patch: { body?: string; state?: "draft" | "approved" | "discarded" | "posted" }) =>
      wrap(() => api.patchReviewComment(id, commentId, patch)),
    post: async () => {
      await wrap(() => api.postReview(id, event));
      setPostOpen(false);
    },
    chat: async (text: string) => {
      if (!text.trim() || sending.current) return;
      sending.current = true;
      try {
        await wrap(() => api.chatReview(id, text.trim()));
        setReply("");
      } finally {
        sending.current = false;
      }
    },
  };
}
