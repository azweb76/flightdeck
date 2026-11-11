import { Box, Button, Chip, Drawer, Stack, Tooltip, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { BoardPr } from "@flightdeck/shared";
import { MarkdownEditor } from "../../ui/components/markdown/index.ts";
import { api } from "../api/index.ts";
import { openExternal } from "../external/index.ts";
import { fixDisabledReason, PrChips } from "../issues/IssuePrs.tsx";

type Detail = Awaited<ReturnType<typeof api.prDetail>>;

export function PrDrawer({ pr, onClose }: { pr: BoardPr | undefined; onClose: () => void }) {
  const [detail, setDetail] = useState<Detail>();
  useEffect(() => {
    setDetail(undefined);
    if (pr) void api.prDetail(pr.id).then(setDetail).catch(() => undefined);
  }, [pr]);
  return (
    <Drawer anchor="right" open={Boolean(pr)} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 } } } }}>
      {pr ? <DrawerBody pr={pr} detail={detail} /> : null}
    </Drawer>
  );
}

function DrawerBody({ pr, detail }: { pr: BoardPr; detail?: Detail }) {
  const nav = useNavigate();
  const why = fixDisabledReason(pr);
  return (
    <Box sx={{ p: 3 }}>
      <Typography sx={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, color: "text.secondary" }}>
        {pr.repo}#{pr.number}
      </Typography>
      <Typography variant="h2" sx={{ mt: 1, fontSize: 18 }}>
        {pr.title}
      </Typography>
      <PrChips pr={pr} />
      <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}>
        <Button size="small" onClick={() => void openExternal(pr.url)}>
          Open in GitHub
        </Button>
        {pr.role === "mine" ? (
          <Tooltip title={why ?? "Fix CI or review comments on this PR"}>
            <span>
              <Button
                size="small"
                disabled={Boolean(why)}
                onClick={() => void api.fixPr(pr.id).then((run) => nav(`/runs/${run.id}`))}
              >
                Fix
              </Button>
            </span>
          </Tooltip>
        ) : (
          <Button size="small" onClick={() => void api.draftPrReview(pr.id).then((s) => nav(`/reviews/${s.id}`))}>
            Draft review
          </Button>
        )}
      </Stack>
      <Typography sx={{ mt: 3, fontWeight: 600 }}>Checks</Typography>
      {(detail?.checks ?? []).map((c) => (
        <Typography key={c.name} sx={{ fontSize: 13 }}>
          {c.conclusion === "failure" && c.url ? (
            <Button size="small" onClick={() => void openExternal(c.url)}>
              {c.name} failed
            </Button>
          ) : (
            `${c.name}: ${c.conclusion}`
          )}
        </Typography>
      ))}
      <Typography sx={{ mt: 3, fontWeight: 600 }}>Reviews</Typography>
      {(detail?.reviews ?? []).map((r, i) => (
        <Box key={`${r.author}-${i}`} sx={{ mb: 1 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
            {r.author} · {r.state}
          </Typography>
          {r.body ? <MarkdownEditor id={`rev-${i}`} value={r.body} readOnly /> : null}
        </Box>
      ))}
      <Typography sx={{ mt: 3, fontWeight: 600 }}>Comments</Typography>
      {(detail?.comments ?? []).map((c) => (
        <Box key={c.id} sx={{ mb: 1 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{c.author}</Typography>
          <MarkdownEditor id={`cmt-${c.id}`} value={c.body} readOnly />
        </Box>
      ))}
      <Typography sx={{ mt: 3, fontWeight: 600 }}>Linked issues</Typography>
      {(detail?.linked ?? []).map((i) => (
        <Chip key={i.id} size="small" component={Link} to={`/issues/${encodeURIComponent(i.id)}`} label={`${i.key} ${i.title}`} clickable sx={{ mr: 0.5, mt: 0.5 }} />
      ))}
    </Box>
  );
}
