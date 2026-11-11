import { useState } from "react";
import { Box, Button, Checkbox, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
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
      <Typography variant="h3" sx={{ mb: 3 }}>
        Repositories
      </Typography>
      <TextField
        label="Clone folder"
        value={folder}
        onChange={(e) => setFolder(e.target.value)}
        onBlur={() => onWorkspace(folder)}
        placeholder="~/.flightdeck/repos"
        fullWidth
        sx={{ mb: 3 }}
      />
      {repos.map((r) => (
        <RepoRow key={r.id} repo={r} onChange={onChange} setError={setError} />
      ))}
      <Stack direction="row" spacing={2} sx={{ mt: 3, flexWrap: "wrap", alignItems: "center" }}>
        <TextField size="small" placeholder="owner" value={owner} onChange={(e) => setOwner(e.target.value)} />
        <TextField size="small" placeholder="name" value={name} onChange={(e) => setName(e.target.value)} />
        <FormControlLabel
          control={<Checkbox checked={clone} onChange={(e) => setClone(e.target.checked)} />}
          label="Clone with gh"
        />
        <Button onClick={() => void add()} disabled={!owner || !name}>
          Add repo
        </Button>
      </Stack>
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
    <Stack
      direction="row"
      spacing={2}
      sx={{
        alignItems: "center",
        py: 2,
        borderBottom: "1px solid",
        borderColor: "divider",
        flexWrap: "wrap",
      }}
    >
      <Typography sx={{ fontFamily: "ui-monospace, monospace", flex: 1 }}>
        {repo.owner}/{repo.name}
      </Typography>
      <Typography sx={{ fontSize: 11, color: "text.secondary", flex: 1 }}>{repo.localPath || "not cloned"}</Typography>
      <FormControlLabel
        control={
          <Checkbox checked={repo.pinned} onChange={() => void api.patchRepo(repo.id, { pinned: !repo.pinned }).then(onChange)} />
        }
        label="Pin"
      />
      <Button
        size="small"
        onClick={() =>
          void api.cloneRepo(repo.id).then(onChange).catch((e: unknown) => {
            setError(e instanceof Error ? e.message : "Clone failed");
          })
        }
      >
        Clone
      </Button>
      <Button size="small" color="error" onClick={() => void api.deleteRepo(repo.id).then(onChange)}>
        Remove
      </Button>
    </Stack>
  );
}
