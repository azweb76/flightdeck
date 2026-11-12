import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Select } from "@mui/material";
import type { CatalogRepo } from "@flightdeck/shared";
import { useEffect, useState } from "react";
import { api } from "../api.ts";
import { FormField } from "../ui/FormField.tsx";

export function RepoPickDialog(props: {
  open: boolean;
  title?: string;
  onClose: () => void;
  onPicked: (slug: string) => void;
}) {
  const [repos, setRepos] = useState<CatalogRepo[]>([]);
  const [repo, setRepo] = useState("");

  useEffect(() => {
    if (!props.open) return;
    setRepo("");
    api.repos().then((r) => setRepos(r.repos));
  }, [props.open]);

  return (
    <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="sm">
      <DialogTitle>{props.title ?? "Pick a repository"}</DialogTitle>
      <DialogContent>
        <FormField label="Repository" hint="Needed for Claude to read the code. Remembered on this issue.">
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
