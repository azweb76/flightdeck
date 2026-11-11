import { useState } from "react";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { isPushable, type CatalogRepo } from "@flightdeck/shared";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/index.ts";
import { useCatalog } from "../repos/index.ts";
import { MarkdownEditor } from "../../ui/components/markdown/index.ts";
import { RepoPicker } from "../../ui/components/repo-picker/index.ts";

export function NewIssuePage() {
  const [params] = useSearchParams();
  const kind = params.get("kind") ?? "github";
  const nav = useNavigate();
  const catalog = useCatalog();
  const [repo, setRepo] = useState<CatalogRepo | null>(null);
  const [projectKey, setProjectKey] = useState("PROJ");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string>();

  async function submit() {
    setError(undefined);
    try {
      if (kind === "adhoc") {
        if (!repo) throw new Error("Pick a repo");
        const run = await api.adhoc(repo.owner, repo.name, title, body);
        nav(`/runs/${run.id}`);
        return;
      }
      if (kind === "jira") {
        const created = await api.draftIssue({ source: "jira", projectKey, title, body });
        nav(`/issues/${encodeURIComponent(created.id)}`);
        return;
      }
      if (!repo) throw new Error("Pick a repo");
      const created = await api.draftIssue({ source: "github", owner: repo.owner, name: repo.name, title, body });
      nav(`/issues/${encodeURIComponent(created.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create");
    }
  }

  const heading = kind === "adhoc" ? "Ad-hoc task" : kind === "jira" ? "New Jira issue" : "New GitHub issue";
  const pushable = kind !== "jira" ? (r: CatalogRepo) => isPushable(r.permission) : undefined;
  return (
    <Box sx={{ p: 4, maxWidth: 640 }}>
      <Typography variant="h2">{heading}</Typography>
      {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}
      <Stack spacing={3} sx={{ mt: 3 }}>
        {kind === "jira" ? (
          <TextField label="Project key" value={projectKey} onChange={(e) => setProjectKey(e.target.value)} />
        ) : (
          <RepoPicker
            repos={catalog.repos}
            value={repo}
            autoFocus
            filter={pushable}
            placeholder="Pick a repo"
            onRefresh={() => void catalog.load(true)}
            refreshing={catalog.refreshing}
            onToggleFavorite={(r) => void catalog.toggleFavorite(r)}
            onChange={(next) => setRepo(next as CatalogRepo | null)}
          />
        )}
        <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Box>
          <Typography sx={{ mb: 1 }}>Body</Typography>
          <MarkdownEditor id={`new-${kind}`} value={body} onChange={setBody} minRows={8} />
        </Box>
        <Button variant="contained" disabled={!title} onClick={() => void submit()}>
          {kind === "adhoc" ? "Start run" : "Create issue"}
        </Button>
      </Stack>
    </Box>
  );
}
