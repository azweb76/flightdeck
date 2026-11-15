import { Alert, Button, Chip, Link, Stack, Typography } from "@mui/material";
import type { OwnPr } from "@flightdeck/shared";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../api.ts";
import { ciColor, ciLabel, reviewLabel } from "./prChips.ts";

export function PrDetailPage() {
  const { owner, name, number } = useParams();
  const nav = useNavigate();
  const [pr, setPr] = useState<OwnPr>();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!owner || !name || !number) return;
    api
      .getPr(owner, name, Number(number))
      .then(setPr)
      .catch((e: Error) => setError(e.message));
  }, [owner, name, number]);

  if (!pr) {
    return error ? <Alert severity="error">{error}</Alert> : <Typography color="text.secondary">Loading…</Typography>;
  }

  return (
    <Stack spacing={3} data-testid="pr-detail">
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2}>
        <Stack spacing={1}>
          <Typography variant="h4">{pr.title}</Typography>
          <Typography color="text.secondary">
            {pr.repoSlug}#{pr.number}
          </Typography>
          <Stack direction="row" gap={0.75} flexWrap="wrap">
            <Chip size="small" label={ciLabel(pr.ci)} color={ciColor(pr.ci)} data-testid="pr-detail-ci" />
            <Chip size="small" label={reviewLabel(pr.review)} variant="outlined" data-testid="pr-detail-review" />
            <Chip size="small" label={pr.draft ? "Draft" : "Ready"} data-testid="pr-detail-draft" />
            {pr.needsYou ? <Chip size="small" color="warning" label="Needs you" /> : null}
          </Stack>
        </Stack>
        <Button variant="outlined" onClick={() => nav("/prs")}>
          All my PRs
        </Button>
      </Stack>
      <Link href={pr.url} target="_blank" rel="noreferrer" data-testid="pr-github-link">
        Open on GitHub
      </Link>
      {pr.changeId ? (
        <Link component="button" onClick={() => nav(`/runs/${pr.changeId}`)} data-testid="pr-change-link">
          Open the Flightdeck change
        </Link>
      ) : null}
    </Stack>
  );
}
