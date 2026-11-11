import { useEffect, useState } from "react";
import { Box, Heading, Label, Spinner, Text } from "@primer/react";
import type { Issue } from "@flightdeck/shared";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api/index.ts";
import { GoalEditor } from "./GoalEditor.tsx";
import { IssueActions } from "./IssueActions.tsx";
import { IssueRunsTab } from "./IssueRunsTab.tsx";

export function IssueDetailPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "goal";
  const [issue, setIssue] = useState<Issue | undefined>();
  const [error, setError] = useState<string>();

  function load() {
    if (!id) return;
    void api.issue(decodeURIComponent(id)).then(setIssue).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Not found");
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!issue) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === "r") void api.refine(issue.id).then(load);
      if (e.key.toLowerCase() === "s") void api.startRun(issue.id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issue]);

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
        {issue.needsYou ? <Label variant="attention">Needs you</Label> : null}
      </Box>
      <IssueActions issue={issue} onChange={load} />
      <TabBar tab={tab} onTab={(t) => setParams({ tab: t })} />
      {tab === "goal" ? <GoalEditor issueId={issue.id} fallback={issue.body} /> : null}
      {tab === "runs" ? <IssueRunsTab issueId={issue.id} /> : null}
      {tab === "prs" ? <Text sx={{ color: "fg.muted" }}>Open a run to see the PR link.</Text> : null}
    </Box>
  );
}

function TabBar({ tab, onTab }: { tab: string; onTab: (t: string) => void }) {
  return (
    <Box
      as="nav"
      sx={{ display: "flex", gap: 3, mb: 3, borderBottom: "1px solid", borderColor: "border.default" }}
    >
      {["goal", "runs", "prs"].map((id) => (
        <Box
          as="button"
          key={id}
          onClick={() => onTab(id)}
          sx={{
            appearance: "none",
            bg: "transparent",
            border: 0,
            borderBottom: "3px solid",
            borderColor: tab === id ? "accent.emphasis" : "transparent",
            fontWeight: tab === id ? 600 : 400,
            pb: 2,
            cursor: "pointer",
          }}
        >
          {id === "goal" ? "Goal" : id === "runs" ? "Runs" : "PRs"}
        </Box>
      ))}
    </Box>
  );
}
