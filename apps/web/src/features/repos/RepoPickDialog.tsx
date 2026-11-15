import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { useEffect, useState } from "react";
import { ContainedButton } from "../../ui/ContainedButton.tsx";
import { FormField } from "../../ui/FormField.tsx";
import { RepoPicker } from "./RepoPicker.tsx";

export function RepoPickDialog(props: {
  open: boolean;
  title?: string;
  onClose: () => void;
  onPicked: (slug: string) => void;
}) {
  const [repo, setRepo] = useState("");

  useEffect(() => {
    if (props.open) setRepo("");
  }, [props.open]);

  return (
    <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="sm">
      <DialogTitle>{props.title ?? "Pick a repository"}</DialogTitle>
      <DialogContent>
        <FormField label="Repository" hint="Needed for Claude to read the code. Remembered as a repo:org/repo Jira label.">
          <RepoPicker value={repo} onChange={setRepo} />
        </FormField>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={props.onClose}>Cancel</Button>
        <ContainedButton disabled={!repo} onClick={() => props.onPicked(repo)} data-testid="confirm-repo">
          Continue
        </ContainedButton>
      </DialogActions>
    </Dialog>
  );
}
