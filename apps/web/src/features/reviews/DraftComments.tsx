import { Box, Button, Chip, Paper, Stack, TextField, Typography } from "@mui/material";
import type { PrReview, ReviewComment } from "@flightdeck/shared";
import { useState } from "react";
import { Markdown } from "../markdown/index.ts";
import { FormField } from "../../ui/FormField.tsx";

export function DraftComments(props: {
  review: PrReview;
  onPatch: (commentId: string, patch: { body?: string; state?: ReviewComment["state"] }) => void;
}) {
  return (
    <Stack spacing={1.5} data-testid="draft-comments">
      <Typography variant="h6">Draft comments</Typography>
      {props.review.comments.length === 0 ? (
        <Typography color="text.secondary">No inline comments. You can still post a summary-only review.</Typography>
      ) : (
        props.review.comments.map((comment) => (
          <DraftCard key={comment.id} comment={comment} onPatch={props.onPatch} />
        ))
      )}
    </Stack>
  );
}

function DraftCard(props: {
  comment: ReviewComment;
  onPatch: (commentId: string, patch: { body?: string; state?: ReviewComment["state"] }) => void;
}) {
  const { comment } = props;
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(comment.body);
  const locked = comment.state === "posted" || comment.state === "discarded";
  return (
    <Paper sx={{ p: 2, border: 1, borderColor: "divider" }} data-testid={`draft-${comment.path}-${comment.line}`}>
      <Typography variant="caption" color="text.secondary" display="block">
        {comment.path}:{comment.line} · {comment.state}
      </Typography>
      {comment.placement === "summary" ? (
        <Chip
          size="small"
          color="warning"
          variant="outlined"
          label="Will post as a summary note (not on the diff)."
          data-testid={`draft-summary-note-${comment.line}`}
          sx={{ mt: 0.75, height: "auto", "& .MuiChip-label": { whiteSpace: "normal", py: 0.5 } }}
        />
      ) : null}
      {editing ? (
        <FormField label="Comment">
          <TextField
            multiline
            fullWidth
            minRows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            inputProps={{ "data-testid": `draft-edit-${comment.line}` }}
          />
        </FormField>
      ) : (
        <Box sx={{ mt: 1 }}>
          <Markdown text={comment.body} />
        </Box>
      )}
      {locked ? null : (
        <Stack direction="row" gap={1} sx={{ mt: 1.5 }}>
          {editing ? (
            <Button
              variant="contained"
              data-testid={`draft-save-${comment.line}`}
              onClick={() => {
                props.onPatch(comment.id, { body });
                setEditing(false);
              }}
            >
              Save
            </Button>
          ) : (
            <Button variant="outlined" data-testid={`draft-edit-btn-${comment.line}`} onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
          {comment.state !== "approved" ? (
            <Button
              variant="contained"
              data-testid={`draft-approve-${comment.line}`}
              onClick={() => {
                props.onPatch(comment.id, editing ? { body, state: "approved" } : { state: "approved" });
                setEditing(false);
              }}
            >
              Approve
            </Button>
          ) : null}
          <Button
            variant="outlined"
            color="error"
            data-testid={`draft-discard-${comment.line}`}
            onClick={() => props.onPatch(comment.id, { state: "discarded" })}
          >
            Discard
          </Button>
        </Stack>
      )}
    </Paper>
  );
}
