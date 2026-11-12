import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
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
  const [repo, setRepo] = useState("acme/web");
  const [idea, setIdea] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!props.open) return;
    api.repos().then((r) => {
      setRepos(r.repos);
      const first = r.repos[0];
      if (first) setRepo(`${first.owner}/${first.name}`);
    });
  }, [props.open]);

  async function start() {
    setBusy(true);
    try {
      const session = await api.startShape({ repoSlug: repo, idea: idea.trim() || "New idea" });
      props.onStarted(session.id);
      props.onClose();
    } catch (e) {
      props.onError(e instanceof Error ? e.message : "Could not start");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          elevation: 24,
          sx: { p: 1, bgcolor: "#ffffff", backgroundImage: "none", color: "#1d1d1f" },
        },
      }}
    >
      <DialogTitle>Start from a new idea</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <FormField label="Repository" hint="The agent reads this repo. Nothing is pushed.">
          <Select value={repo} onChange={(e) => setRepo(e.target.value)} data-testid="repo-select">
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
        <Button variant="contained" disabled={busy || !repo} onClick={start} data-testid="start-idea">
          Shape
        </Button>
      </DialogActions>
    </Dialog>
  );
}
