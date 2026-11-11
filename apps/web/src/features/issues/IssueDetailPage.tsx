import { useEffect, useState } from "react";
import { Box, Heading, Label, Spinner, Text } from "@primer/react";
import type { Issue } from "@flightdeck/shared";
import Markdown from "react-markdown";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/index.ts";

export function IssueDetailPage() {
  const { id } = useParams();
  const [issue, setIssue] = useState<Issue | undefined>();
  const [error, setError] = useState<string>();
  const [tab, setTab] = useState<"goal" | "runs" | "prs">("goal");

  useEffect(() => {
    if (!id) return;
    void api
      .issue(decodeURIComponent(id))
      .then(setIssue)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Not found"));
  }, [id]);

  if (error) return <Box sx={{ p: 4 }}>{error}</Box>;
  if (!issue) return <Box sx={{ p: 4 }}><Spinner /></Box>;

  return (
    <Box sx={{ p: [3, 4] }}>
      <Text sx={{ color: "fg.muted", fontSize: 1 }}>
        <Link to="/issues">Issues</Link> / {issue.key}
      </Text>
      <Heading as="h2" sx={{ mt: 2 }}>
        {issue.key} {issue.title}
      </Heading>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", my: 3 }}>
        <Label>{issue.source}</Label>
        {issue.repos.map((r) => (
          <Label key={`${r.owner}/${r.name}`} variant="secondary">
            {r.label ?? `${r.owner}/${r.name}`}
          </Label>
        ))}
        {issue.repoWarning !== "none" ? (
          <Label variant="attention">
            {issue.repoWarning === "missing" ? "No repo label" : "Multiple repo labels"}
          </Label>
        ) : null}
      </Box>
      <Box
        as="nav"
        aria-label="Issue sections"
        sx={{ display: "flex", gap: 3, mb: 3, borderBottom: "1px solid", borderColor: "border.default" }}
      >
        {(["goal", "runs", "prs"] as const).map((id) => (
          <Box
            as="button"
            key={id}
            onClick={() => setTab(id)}
            sx={{
              appearance: "none",
              bg: "transparent",
              border: 0,
              borderBottom: "3px solid",
              borderColor: tab === id ? "accent.emphasis" : "transparent",
              color: tab === id ? "fg.default" : "fg.muted",
              fontWeight: tab === id ? 600 : 400,
              pb: 2,
              cursor: "pointer",
            }}
          >
            {id === "goal" ? "Goal" : id === "runs" ? "Runs" : "PRs"}
          </Box>
        ))}
      </Box>
      {tab === "goal" ? (
        <Box sx={{ border: "1px solid", borderColor: "border.default", borderRadius: 2, p: 3 }}>
          {issue.body.trim() ? (
            <Markdown>{issue.body}</Markdown>
          ) : (
            <Text sx={{ color: "fg.muted" }}>No description on this issue.</Text>
          )}
        </Box>
      ) : (
        <Text sx={{ color: "fg.muted" }}>Coming in a later phase.</Text>
      )}
    </Box>
  );
}
