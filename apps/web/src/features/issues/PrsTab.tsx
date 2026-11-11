import { Box, Button, Stack, Tooltip, Typography } from "@mui/material";
import type { Issue } from "@flightdeck/shared";
import { useNavigate } from "react-router-dom";
import { api } from "../api/index.ts";
import { fixDisabledReason, ForkHint, PrChips } from "./IssuePrs.tsx";

export function PrsTab({ issue, onChange }: { issue: Issue; onChange: () => void }) {
  const nav = useNavigate();
  const prs = issue.prs ?? [];
  if (!prs.length) {
    return <Typography color="text.secondary">No open PRs linked to this card.</Typography>;
  }
  return (
    <Stack spacing={2}>
      {prs.map((pr) => {
        const blocked = fixDisabledReason(pr);
        return (
          <Box key={pr.id} sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
            <Typography sx={{ fontWeight: 600 }}>
              {pr.repo}#{pr.number} {pr.title}
            </Typography>
            <PrChips pr={pr} />
            <ForkHint pr={pr} />
            <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}>
              {pr.role === "mine" ? (
                <Tooltip title={blocked ?? "Fix CI and review comments on this PR branch"}>
                  <span>
                    <Button
                      variant="contained"
                      disabled={Boolean(blocked)}
                      onClick={() => void api.fixPr(pr.id).then((run) => nav(`/runs/${run.id}`))}
                    >
                      Fix CI/review
                    </Button>
                  </span>
                </Tooltip>
              ) : (
                <>
                  <Button href={pr.url} target="_blank" rel="noreferrer">
                    Open in GitHub
                  </Button>
                  <Button
                    onClick={() =>
                      void api.draftPrReview(pr.id).then((r) => {
                        onChange();
                        nav(`/reviews/${r.id}`);
                      })
                    }
                  >
                    Draft review
                  </Button>
                </>
              )}
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}
