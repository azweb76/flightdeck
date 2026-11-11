import { useEffect, useState } from "react";
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import type { Repo } from "@flightdeck/shared";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/index.ts";
import { MarkdownEditor } from "../../ui/components/markdown/index.ts";

export function NewIssuePage() {
  const [params] = useSearchParams();
  const kind = params.get("kind") ?? "github";
  const nav = useNavigate();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [repoId, setRepoId] = useState<number>();
  const [projectKey, setProjectKey] = useState("PROJ");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    void api.repos().then((r) => {
      setRepos(r.repos);
      setRepoId(r.repos[0]?.id);
    });
  }, []);

  async function submit() {
    setError(undefined);
    try {
      if (kind === "adhoc") {
        if (!repoId) throw new Error("Pick a repo");
        const run = await api.adhoc(repoId, title, body);
        nav(`/runs/${run.id}`);
        return;
      }
      if (kind === "jira") {
        const created = await api.draftIssue({ source: "jira", projectKey, title, body });
        nav(`/issues/${encodeURIComponent(created.id)}`);
        return;
      }
      if (!repoId) throw new Error("Pick a repo");
      const created = await api.draftIssue({ source: "github", repoId, title, body });
      nav(`/issues/${encodeURIComponent(created.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create");
    }
  }

  const heading = kind === "adhoc" ? "Ad-hoc task" : kind === "jira" ? "New Jira issue" : "New GitHub issue";
  return (
    <Box sx={{ p: 4, maxWidth: 640 }}>
      <Typography variant="h2">{heading}</Typography>
      {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}
      <Stack spacing={3} sx={{ mt: 3 }}>
        {kind === "jira" ? (
          <TextField label="Project key" value={projectKey} onChange={(e) => setProjectKey(e.target.value)} />
        ) : (
          <TextField
            select
            label="Repo"
            value={repoId ?? ""}
            onChange={(e) => setRepoId(Number(e.target.value))}
          >
            {repos.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.owner}/{r.name}
              </MenuItem>
            ))}
          </TextField>
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
