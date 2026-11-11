import { useState } from "react";
import { Box, Button, Checkbox, FormControl, Text, TextInput } from "@primer/react";
import type { Repo } from "@flightdeck/shared";
import { api } from "../api/index.ts";

export function RepoSettings({
  repos,
  workspaceFolder,
  onWorkspace,
  onChange,
  setError,
}: {
  repos: Repo[];
  workspaceFolder: string;
  onWorkspace: (path: string) => void;
  onChange: () => void;
  setError: (m: string | undefined) => void;
}) {
  const [owner, setOwner] = useState("");
  const [name, setName] = useState("");
  const [clone, setClone] = useState(true);
  const [folder, setFolder] = useState(workspaceFolder);

  async function add() {
    setError(undefined);
    try {
      await api.addRepo({ owner, name, clone, defaultBranch: "main" });
      setOwner("");
      setName("");
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add repo");
    }
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Text as="h3" sx={{ fontSize: 2, fontWeight: 600, display: "block", mb: 3 }}>
        Repositories
      </Text>
      <FormControl sx={{ mb: 3 }}>
        <FormControl.Label>Workspace folder for clones</FormControl.Label>
        <TextInput
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          onBlur={() => onWorkspace(folder)}
          placeholder="~/.flightdeck/repos"
        />
      </FormControl>
      {repos.map((r) => (
        <RepoRow key={r.id} repo={r} onChange={onChange} setError={setError} />
      ))}
      <Box sx={{ display: "flex", gap: 2, mt: 3, flexWrap: "wrap", alignItems: "center" }}>
        <TextInput placeholder="owner" value={owner} onChange={(e) => setOwner(e.target.value)} />
        <TextInput placeholder="name" value={name} onChange={(e) => setName(e.target.value)} />
        <FormControl>
          <Checkbox checked={clone} onChange={(e) => setClone(e.target.checked)} />
          <FormControl.Label>Clone with gh</FormControl.Label>
        </FormControl>
        <Button onClick={() => void add()} disabled={!owner || !name}>
          Add repo
        </Button>
      </Box>
    </Box>
  );
}

function RepoRow({
  repo,
  onChange,
  setError,
}: {
  repo: Repo;
  onChange: () => void;
  setError: (m: string | undefined) => void;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 2,
        alignItems: "center",
        py: 2,
        borderBottom: "1px solid",
        borderColor: "border.muted",
        flexWrap: "wrap",
      }}
    >
      <Text sx={{ fontFamily: "mono", flex: 1 }}>
        {repo.owner}/{repo.name}
      </Text>
      <Text sx={{ fontSize: 0, color: "fg.muted", flex: 1 }}>{repo.localPath || "not cloned"}</Text>
      <FormControl>
        <Checkbox
          checked={repo.pinned}
          onChange={() => void api.patchRepo(repo.id, { pinned: !repo.pinned }).then(onChange)}
        />
        <FormControl.Label>Pin</FormControl.Label>
      </FormControl>
      <Button
        size="small"
        onClick={() => void api.cloneRepo(repo.id).then(onChange).catch((e: unknown) => {
          setError(e instanceof Error ? e.message : "Clone failed");
        })}
      >
        Clone
      </Button>
      <Button
        size="small"
        variant="danger"
        onClick={() => void api.deleteRepo(repo.id).then(onChange)}
      >
        Remove
      </Button>
    </Box>
  );
}
