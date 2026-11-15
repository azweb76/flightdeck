import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { useEffect, useState } from "react";
import { api } from "../api.ts";
import { RepoPicker } from "../features/repos/index.ts";
import { GatedButton } from "../preflight/index.ts";
import { FormField } from "../ui/FormField.tsx";

export function StartIdeaDialog(props: {
  open: boolean;
  onClose: () => void;
  onError: (msg: string) => void;
  onStarted: (id: string) => void;
}) {
  const [repo, setRepo] = useState("");
  const [idea, setIdea] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!props.open) return;
    setIdea("");
    setRepo("");
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
          <RepoPicker value={repo} onChange={setRepo} />
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
        <Button onMouseDown={props.onClose}>Cancel</Button>
        <GatedButton
          gate="refine"
          variant="contained"
          disabled={busy || !repo || !idea.trim()}
          onClick={start}
          testId="start-idea"
        >
          Refine
        </GatedButton>
      </DialogActions>
    </Dialog>
  );
}
