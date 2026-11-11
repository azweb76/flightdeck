import { Box, Button, Chip, Stack, Tooltip, Typography } from "@mui/material";
import type { BoardPr } from "@flightdeck/shared";
import { useNavigate } from "react-router-dom";
import { api } from "../api/index.ts";
import { openExternal } from "../external/index.ts";
import { fixDisabledReason, ForkHint, PrChips } from "../issues/IssuePrs.tsx";

export function PrCard({ pr, onOpen, tab }: { pr: BoardPr; onOpen: () => void; tab: "mine" | "review" }) {
  return (
    <Box
      onClick={onOpen}
      sx={{
        p: 2,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        cursor: "pointer",
        "&:hover": { borderColor: "primary.main" },
      }}
    >
      <Typography sx={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11, color: "text.secondary" }}>
        {pr.repo}#{pr.number}
      </Typography>
      <Typography sx={{ mt: 0.5, fontWeight: 600 }}>{pr.title}</Typography>
      <PrChips pr={pr} />
      <ForkHint pr={pr} />
      <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: "wrap", gap: 0.5 }}>
        {pr.linkedIssueIds.map((id) => (
          <Chip key={id} size="small" variant="outlined" label={id.replace(/^jira:|^github:/, "")} />
        ))}
      </Stack>
      <Box sx={{ mt: 1 }} onClick={(e) => e.stopPropagation()}>
        {tab === "mine" ? <MineActions pr={pr} /> : <ReviewActions pr={pr} />}
      </Box>
    </Box>
  );
}

function MineActions({ pr }: { pr: BoardPr }) {
  const nav = useNavigate();
  const why = fixDisabledReason(pr);
  const showFix = pr.ci === "failing" || pr.review === "changes_requested";
  if (!showFix) return null;
  const btn = (
    <Button
      size="small"
      disabled={Boolean(why)}
      onClick={() => void api.fixPr(pr.id).then((run) => nav(`/runs/${run.id}`))}
    >
      Fix
    </Button>
  );
  if (!why) return btn;
  return (
    <Tooltip title={why}>
      <span>{btn}</span>
    </Tooltip>
  );
}

function ReviewActions({ pr }: { pr: BoardPr }) {
  const nav = useNavigate();
  return (
    <Stack direction="row" spacing={1}>
      <Button size="small" onClick={() => void openExternal(pr.url)}>
        Open in GitHub
      </Button>
      <Button size="small" onClick={() => void api.draftPrReview(pr.id).then((s) => nav(`/reviews/${s.id}`))}>
        Draft review
      </Button>
    </Stack>
  );
}
