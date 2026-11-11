import { Button } from "@mui/material";
import type { NextItem } from "@flightdeck/shared";
import { useNavigate } from "react-router-dom";
import { api } from "../api/index.ts";

export function PrimaryAction({ item, onAnswer }: { item: NextItem; onAnswer?: () => void }) {
  const nav = useNavigate();
  if (item.action === "answer") {
    return (
      <Button
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          onAnswer?.();
        }}
      >
        Answer
      </Button>
    );
  }
  if (item.action === "fix" && item.prId) {
    return (
      <Button
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          void api.fixPr(item.prId!).then((r) => nav(`/runs/${r.id}`));
        }}
      >
        Fix
      </Button>
    );
  }
  if (item.action === "draft_review" && item.prId) {
    return (
      <Button
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          void api.draftPrReview(item.prId!).then((s) => nav(`/reviews/${s.id}`));
        }}
      >
        Draft review
      </Button>
    );
  }
  return (
    <Button
      size="small"
      onClick={(e) => {
        e.stopPropagation();
        void api.startNext([item.id]).then((r) => nav(`/runs/${r.runs[0]?.id}`));
      }}
    >
      Start
    </Button>
  );
}
