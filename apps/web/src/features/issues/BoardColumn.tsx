import { Box, Text } from "@primer/react";
import type { Issue, IssueStage } from "@flightdeck/shared";
import { IssueCard } from "./IssueCard.tsx";

const TITLES: Record<IssueStage, string> = {
  new: "New",
  refined: "Refined",
  running: "Running",
  pr_open: "PR Open",
};

export function BoardColumn({ stage, issues }: { stage: IssueStage; issues: Issue[] }) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 220,
        bg: "canvas.subtle",
        border: "1px solid",
        borderColor: "border.muted",
        borderRadius: 2,
        p: 2,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", px: 1, mb: 2 }}>
        <Text sx={{ fontWeight: 600 }}>{TITLES[stage]}</Text>
        <Text sx={{ color: "fg.muted" }}>{issues.length}</Text>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {issues.map((issue) => (
          <IssueCard key={issue.id} issue={issue} />
        ))}
        {issues.length === 0 ? (
          <Text sx={{ color: "fg.subtle", fontSize: 1, px: 1 }}>
            {stage === "new" ? "No issues yet" : "Coming in a later phase"}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
}
