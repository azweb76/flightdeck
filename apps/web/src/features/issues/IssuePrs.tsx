import { Box, Chip, Stack, Tooltip, Typography } from "@mui/material";
import type { BoardPr } from "@flightdeck/shared";

export function PrChips({ pr }: { pr: BoardPr }) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
      <Chip size="small" label={pr.role === "mine" ? "Mine" : "Review"} color={pr.role === "mine" ? "info" : "default"} />
      <Chip size="small" label={ciLabel(pr.ci)} color={pr.ci === "passing" ? "success" : pr.ci === "failing" ? "error" : "warning"} />
      <Chip size="small" variant="outlined" label={reviewLabel(pr)} />
      {pr.draft ? <Chip size="small" variant="outlined" label="Draft" /> : null}
      <Chip size="small" variant="outlined" label={`${pr.ageDays}d`} />
    </Stack>
  );
}

export function NestedPrs({ prs }: { prs: BoardPr[] }) {
  if (!prs.length) return null;
  return (
    <Box sx={{ mt: 1 }}>
      {prs.map((pr) => (
        <Box key={pr.id} sx={{ mt: 0.5 }}>
          <Typography sx={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11, color: "text.secondary" }}>
            {pr.repo}#{pr.number}
          </Typography>
          <PrChips pr={pr} />
        </Box>
      ))}
    </Box>
  );
}

export function fixDisabledReason(pr: BoardPr): string | undefined {
  if (pr.role !== "mine") return "Fix runs only on PRs you authored";
  if (pr.isFork || !pr.viewerCanPush) return "Can't push to this PR head (fork or no write access)";
  return undefined;
}

function ciLabel(ci: BoardPr["ci"]): string {
  if (ci === "passing") return "CI passing";
  if (ci === "failing") return "CI failing";
  return "CI pending";
}

function reviewLabel(pr: BoardPr): string {
  if (pr.review === "approved") return "Approved";
  if (pr.review === "changes_requested") return `Changes requested${pr.unresolvedThreads ? ` · ${pr.unresolvedThreads}` : ""}`;
  if (pr.unresolvedThreads) return `${pr.unresolvedThreads} unresolved`;
  return "Review pending";
}

export function ForkHint({ pr }: { pr: BoardPr }) {
  if (!pr.isFork) return null;
  return (
    <Tooltip title="Head is a fork">
      <Typography sx={{ fontSize: 11, color: "text.secondary" }}>Fork</Typography>
    </Tooltip>
  );
}
