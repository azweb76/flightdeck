import { useEffect, useState } from "react";
import { Box, Button, Checkbox, FormControl, Text, TextInput } from "@primer/react";
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
      <Text sx={{ color: "fg.muted", display: "block", mb: 3 }}>
        Register the GitHub repos this machine will work in. Cloning uses `gh repo clone`.
      </Text>
      {repos.map((r) => (
        <Text key={r.id} sx={{ display: "block", fontFamily: "mono", mb: 1 }}>
          {r.owner}/{r.name}
          {r.pinned ? " · pinned" : ""}
        </Text>
      ))}
      <Box sx={{ display: "flex", gap: 2, mt: 3, flexWrap: "wrap", alignItems: "center" }}>
        <TextInput placeholder="owner" value={owner} onChange={(e) => setOwner(e.target.value)} />
        <TextInput placeholder="name" value={name} onChange={(e) => setName(e.target.value)} />
        <FormControl>
          <Checkbox checked={clone} onChange={(e) => setClone(e.target.checked)} />
          <FormControl.Label>Clone with gh</FormControl.Label>
        </FormControl>
        <Button onClick={() => void add()} disabled={!owner || !name}>
          Add
        </Button>
      </Box>
      {error ? <Text sx={{ color: "danger.fg", display: "block", mt: 2 }}>{error}</Text> : null}
    </Box>
  );
}
