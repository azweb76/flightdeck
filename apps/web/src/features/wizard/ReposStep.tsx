import { useEffect, useState } from "react";
import { Alert, Box, Button, Checkbox, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import type { Repo } from "@flightdeck/shared";
import { api } from "../api/index.ts";

export function ReposStep() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [owner, setOwner] = useState("");
  const [name, setName] = useState("");
  const [clone, setClone] = useState(true);
  const [error, setError] = useState<string>();

  async function refresh() {
    const r = await api.repos();
    setRepos(r.repos);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function add() {
    setError(undefined);
    try {
      await api.addRepo({ owner, name, clone, pinned: repos.length === 0 });
      setOwner("");
      setName("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add repo");
    }
  }

  return (
    <Box>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Register the GitHub repos this machine will work in. Cloning uses `gh repo clone`.
      </Typography>
      {repos.map((r) => (
        <Typography key={r.id} sx={{ fontFamily: "ui-monospace, monospace", mb: 1 }}>
          {r.owner}/{r.name}
          {r.pinned ? " · pinned" : ""}
        </Typography>
      ))}
      <Stack direction="row" spacing={2} sx={{ mt: 3, flexWrap: "wrap", alignItems: "center" }}>
        <TextField size="small" placeholder="owner" value={owner} onChange={(e) => setOwner(e.target.value)} />
        <TextField size="small" placeholder="name" value={name} onChange={(e) => setName(e.target.value)} />
        <FormControlLabel
          control={<Checkbox checked={clone} onChange={(e) => setClone(e.target.checked)} />}
          label="Clone with gh"
        />
        <Button onClick={() => void add()} disabled={!owner || !name}>
          Add
        </Button>
      </Stack>
      {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}
    </Box>
  );
}
