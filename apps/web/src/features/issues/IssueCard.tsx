import { Box, Label, Text } from "@primer/react";
import type { Issue } from "@flightdeck/shared";
import { Link } from "react-router-dom";
import { issueWarningText } from "./warning.ts";

/** Canonical React component: an issue card on the board. */
export function IssueCard({ issue }: { issue: Issue }) {
  const warning = issueWarningText(issue);
  const unregistered = issue.repos.filter((r) => !r.registered);

  return (
    <Box
      as={Link}
      to={`/issues/${encodeURIComponent(issue.id)}`}
      sx={{
        display: "block",
        p: 3,
        bg: "canvas.default",
        border: "1px solid",
        borderColor: warning ? "attention.emphasis" : "border.default",
        borderRadius: 2,
        textDecoration: "none",
        color: "fg.default",
        "&:hover": { borderColor: "accent.emphasis" },
      }}
    >
      <Text sx={{ fontFamily: "mono", fontSize: 0, color: "fg.muted" }}>{issue.key}</Text>
      <Text as="p" sx={{ m: 0, mt: 1, fontWeight: 600, fontSize: 1 }}>
        {issue.title}
      </Text>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2 }}>
        <Label variant={issue.source === "jira" ? "accent" : "done"}>{issue.source}</Label>
        {issue.repos.map((r) => (
          <Label key={`${r.owner}/${r.name}`} variant="secondary">
            {r.label ?? `${r.owner}/${r.name}`}
          </Label>
        ))}
      </Box>
      {warning ? (
        <Text sx={{ display: "block", mt: 2, fontSize: 0, color: "attention.fg" }}>
          {warning}
          {unregistered.length
            ? ` · unknown: ${unregistered.map((r) => `${r.owner}/${r.name}`).join(", ")}`
            : ""}
        </Text>
      ) : null}
    </Box>
  );
}
