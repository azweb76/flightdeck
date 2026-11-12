import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Select, TextField } from "@mui/material";
import type { CatalogRepo } from "@flightdeck/shared";
import { useEffect, useState } from "react";
import { api } from "../api.ts";
import { FormField } from "../ui/FormField.tsx";

export function StartIdeaDialog(props: {
  open: boolean;
  onClose: () => void;
  onError: (msg: string) => void;
  onStarted: (id: string) => void;
}) {
  const [repos, setRepos] = useState<CatalogRepo[]>([]);
  const [repo, setRepo] = useState("");
  const [idea, setIdea] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!props.open) return;
    setIdea("");
    setRepo("");
    api.repos().then((r) => setRepos(r.repos));
  }, [props.open]);

  async function start() {
    if (!idea.trim()) {
      props.onError("Write an idea first");
      return;
    }
    setBusy(true);
    try {
      const session = await api.startShape({ repoSlug: repo, idea: idea.trim() });
      props.onStarted(session.id);
      props.onClose();
    } catch (e) {
      props.onError(e instanceof Error ? e.message : "Could not start");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="sm">
      <DialogTitle>Start from a new idea</DialogTitle>
      <DialogContent>
        <FormField label="Repository" hint="The agent reads this repo. Nothing is pushed.">
          <Select displayEmpty value={repo} onChange={(e) => setRepo(e.target.value)} data-testid="repo-select">
            <MenuItem value="">
              <em>Choose a repo</em>
            </MenuItem>
            {repos.map((r) => {
              const slug = `${r.owner}/${r.name}`;
              return (
                <MenuItem key={slug} value={slug}>
                  {slug}
                </MenuItem>
              );
            })}
          </Select>
        </FormField>
        <FormField label="Idea">
          <TextField
            multiline
            minRows={4}
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Export invoices as CSV"
            inputProps={{ "data-testid": "idea-input" }}
          />
        </FormField>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={props.onClose}>Cancel</Button>
        <Button variant="contained" disabled={busy || !repo || !idea.trim()} onClick={start} data-testid="start-idea">
          Shape
        </Button>
      </DialogActions>
    </Dialog>
  );
}
