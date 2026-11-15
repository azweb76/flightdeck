import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import type { ReviewVerdict } from "@flightdeck/shared";
import { ContainedButton } from "../../ui/ContainedButton.tsx";

export function PostReviewDialog(props: {
  open: boolean;
  event: ReviewVerdict;
  approvedCount: number;
  busy: boolean;
  onEvent: (event: ReviewVerdict) => void;
  onClose: () => void;
  onPost: () => void;
}) {
  return (
    <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="sm" data-testid="post-review-dialog">
      <DialogTitle>Post review</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography color="text.secondary">
          Posts {props.approvedCount} approved comment{props.approvedCount === 1 ? "" : "s"} as one GitHub review. Discarded
          comments stay local.
        </Typography>
        <FormControl>
          <RadioGroup
            value={props.event}
            onChange={(e) => props.onEvent(e.target.value as ReviewVerdict)}
            data-testid="review-verdict"
          >
            <FormControlLabel value="COMMENT" control={<Radio />} label="Comment" data-testid="verdict-comment" />
            <FormControlLabel value="APPROVE" control={<Radio />} label="Approve" data-testid="verdict-approve" />
            <FormControlLabel
              value="REQUEST_CHANGES"
              control={<Radio />}
              label="Request changes"
              data-testid="verdict-request-changes"
            />
          </RadioGroup>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose}>Cancel</Button>
        <ContainedButton data-testid="confirm-post-review" disabled={props.busy} onClick={props.onPost}>
          Post to GitHub
        </ContainedButton>
      </DialogActions>
    </Dialog>
  );
}
