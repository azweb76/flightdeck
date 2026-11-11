import { Box, Button, Heading, Label, Spinner, Text } from "@primer/react";
import { Link, useSearchParams } from "react-router-dom";
import type { IssueStage } from "@flightdeck/shared";
import { BoardColumn } from "./BoardColumn.tsx";
import { useAssignedIssues } from "./useAssignedIssues.ts";

const STAGES: IssueStage[] = ["new", "refined", "running", "pr_open"];

export function IssuesPage() {
  const [params, setParams] = useSearchParams();
  const source = params.get("source") ?? "all";
  const repo = params.get("repo") ?? undefined;
  const { issues, errors, offline, offlineSources, load } = useAssignedIssues(source, repo);

  function setSource(next: string) {
    const p = new URLSearchParams(params);
    if (next === "all") p.delete("source");
    else p.set("source", next);
    setParams(p);
  }

  return (
    <Box sx={{ p: [3, 4] }}>
      <Heading as="h2" sx={{ mb: 3 }}>
        Issues
      </Heading>
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap", alignItems: "center" }}>
        {(["all", "jira", "github"] as const).map((s) => (
          <FilterChip key={s} active={source === s} onClick={() => setSource(s)}>
            {s === "all" ? "All sources" : s === "jira" ? "Jira" : "GitHub"}
          </FilterChip>
        ))}
        <Label variant="secondary">Repo: {repo ?? "all"}</Label>
        <Button as={Link} to="/issues/new?kind=github" size="small">
          New GitHub issue
        </Button>
        <Button as={Link} to="/issues/new?kind=jira" size="small">
          New Jira issue
        </Button>
        <Button as={Link} to="/issues/new?kind=adhoc" size="small">
          Ad-hoc task
        </Button>
        <Button size="small" onClick={() => load(true)}>
          Refresh
        </Button>
      </Box>
      {offline ? (
        <Text sx={{ color: "attention.fg", display: "block", mb: 2 }}>
          Offline — showing cached issues. Start and write-backs are disabled.
        </Text>
      ) : null}
      {!offline && offlineSources.jira ? (
        <Text sx={{ color: "attention.fg", display: "block", mb: 2 }}>Jira is unavailable. GitHub issues can still start.</Text>
      ) : null}
      {!offline && offlineSources.github ? (
        <Text sx={{ color: "attention.fg", display: "block", mb: 2 }}>GitHub is unavailable. Jira issues can still start.</Text>
      ) : null}
      {errors.length ? (
        <Text sx={{ color: "danger.fg", display: "block", mb: 3 }}>{errors.join(" · ")}</Text>
      ) : null}
      {!issues ? (
        <Spinner />
      ) : (
        <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start", overflowX: "auto", pb: 3 }}>
          {STAGES.map((stage) => (
            <BoardColumn key={stage} stage={stage} issues={issues.filter((i) => i.stage === stage)} />
          ))}
        </Box>
      )}
    </Box>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <Box
      as="button"
      onClick={onClick}
      sx={{
        border: "1px solid",
        borderColor: active ? "accent.emphasis" : "border.default",
        bg: active ? "accent.subtle" : "canvas.default",
        color: "fg.default",
        borderRadius: 100,
        px: 3,
        py: 1,
        fontSize: 1,
        cursor: "pointer",
      }}
    >
      {children}
    </Box>
  );
}
