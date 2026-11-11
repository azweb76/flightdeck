import { useEffect, useState } from "react";
import { Box, Button, FormControl, Heading, Text, TextInput, Textarea } from "@primer/react";
import type { Repo } from "@flightdeck/shared";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/index.ts";

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

  return (
    <Box sx={{ p: [3, 4], maxWidth: 640 }}>
      <Heading as="h2">{kind === "adhoc" ? "Ad-hoc task" : kind === "jira" ? "New Jira issue" : "New GitHub issue"}</Heading>
      {error ? <Text sx={{ color: "danger.fg" }}>{error}</Text> : null}
      {kind === "jira" ? (
        <FormControl sx={{ mt: 3 }}>
          <FormControl.Label>Project key</FormControl.Label>
          <TextInput value={projectKey} onChange={(e) => setProjectKey(e.target.value)} />
        </FormControl>
      ) : (
        <FormControl sx={{ mt: 3 }}>
          <FormControl.Label>Repo</FormControl.Label>
          <select value={repoId ?? ""} onChange={(e) => setRepoId(Number(e.target.value))} style={{ padding: 6 }}>
            {repos.map((r) => (
              <option key={r.id} value={r.id}>
                {r.owner}/{r.name}
              </option>
            ))}
          </select>
        </FormControl>
      )}
      <FormControl sx={{ mt: 3 }}>
        <FormControl.Label>Title</FormControl.Label>
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
      </FormControl>
      <FormControl sx={{ mt: 3 }}>
        <FormControl.Label>Body</FormControl.Label>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} />
      </FormControl>
      <Button sx={{ mt: 3 }} variant="primary" disabled={!title} onClick={() => void submit()}>
        {kind === "adhoc" ? "Start run" : "Create issue"}
      </Button>
    </Box>
  );
}
