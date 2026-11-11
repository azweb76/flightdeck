import { Stack, Button, Tooltip } from "@mui/material";
import { useState } from "react";
import { isPushable, slugOf, type CatalogRepo, type Issue } from "@flightdeck/shared";
import { useNavigate } from "react-router-dom";
import { api } from "../api/index.ts";
import { useCatalog } from "../repos/index.ts";
import { RepoPicker } from "../../ui/components/repo-picker/index.ts";
import { refineDisabledReason, startDisabledReason } from "./disableReasons.ts";

export function IssueActions({
  issue,
  onChange,
  offline,
}: {
  issue: Issue;
  onChange: () => void;
  offline?: boolean;
}) {
  const nav = useNavigate();
  const catalog = useCatalog();
  const oneRepo = issue.repos.length === 1;
  const [picked, setPicked] = useState<CatalogRepo | null>(null);
  const slug = picked ? slugOf(picked) : issue.repos[0] ? slugOf(issue.repos[0]) : undefined;
  const refineWhy = refineDisabledReason(Boolean(offline));
  const startWhy = startDisabledReason(issue, Boolean(offline), Boolean(picked));

  async function start() {
    const run = await api.startRun(issue.id, slug);
    nav(`/runs/${run.id}`);
  }

  return (
    <Stack spacing={2} sx={{ mb: 3 }}>
      {!oneRepo ? (
        <RepoPicker
          label="Repository"
          repos={catalog.repos}
          value={picked}
          filter={(r) => isPushable(r.permission)}
          placeholder="Pick a repo to start"
          onRefresh={() => void catalog.load(true)}
          refreshing={catalog.refreshing}
          onToggleFavorite={(r) => void catalog.toggleFavorite(r)}
          onChange={(next) => setPicked(next as CatalogRepo | null)}
        />
      ) : null}
      <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", gap: 1 }}>
        <WhyButton why={refineWhy} onClick={() => void api.refine(issue.id).then(() => nav(`/issues/${encodeURIComponent(issue.id)}?tab=goal`))}>
          Refine (R)
        </WhyButton>
        <WhyButton why={startWhy} variant="contained" onClick={() => void start()}>
          Start (S)
        </WhyButton>
        {issue.latestRunId ? (
          <WhyButton why={refineWhy} onClick={() => void api.fixRun(issue.latestRunId!).then((run) => nav(`/runs/${run.id}`))}>
            Fix
          </WhyButton>
        ) : null}
        {issue.prs?.some((p) => p.role === "mine") ? (
          <Button onClick={() => nav(`/issues/${encodeURIComponent(issue.id)}?tab=prs`)}>PR Open</Button>
        ) : null}
        {issue.repoWarning === "multiple" ? (
          <Button onClick={() => void api.splitIssue(issue.id).then(onChange)}>Split into sub-issues</Button>
        ) : null}
      </Stack>
    </Stack>
  );
}

function WhyButton({
  why,
  variant,
  onClick,
  children,
}: {
  why?: string;
  variant?: "contained" | "text" | "outlined";
  onClick: () => void;
  children: string;
}) {
  const btn = (
    <Button variant={variant} disabled={Boolean(why)} onClick={onClick}>
      {children}
    </Button>
  );
  if (!why) return btn;
  return (
    <Tooltip title={why}>
      <span>{btn}</span>
    </Tooltip>
  );
}
