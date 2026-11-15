import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import type { CatalogView } from "@flightdeck/shared";
import { useEffect, useState } from "react";
import { api } from "../api.ts";
import { FormField } from "../ui/FormField.tsx";
import { RepoPicker } from "./RepoPicker.tsx";

export function RepoPickDialog(props: {
  open: boolean;
  title?: string;
  onClose: () => void;
  onPicked: (slug: string) => void;
}) {
  const [catalog, setCatalog] = useState<CatalogView>();
  const [repo, setRepo] = useState("");

  useEffect(() => {
    if (!props.open) return;
    setRepo("");
    void api.repos().then(setCatalog);
  }, [props.open]);

  return (
    <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="sm">
      <DialogTitle>{props.title ?? "Pick a repository"}</DialogTitle>
      <DialogContent>
        <FormField label="Repository" hint="Needed for Claude to read the code. Remembered as a repo:org/repo Jira label.">
          <RepoPicker catalog={catalog} value={repo} onChange={setRepo} onCatalog={setCatalog} />
        </FormField>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={props.onClose}>Cancel</Button>
        <Button variant="contained" disabled={!repo} onClick={() => props.onPicked(repo)} data-testid="confirm-repo">
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
}
