import { Checkbox, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import type { Settings } from "@flightdeck/shared";
import { SettingsCard } from "./SettingsCard.tsx";

export function BoardSettings({
  settings,
  onSave,
}: {
  settings: Settings;
  onSave: (patch: Partial<Settings>) => Promise<void>;
}) {
  return (
    <SettingsCard title="Board PRs">
      <Stack spacing={1}>
        <Typography color="text.secondary">
          Open PRs you authored or were asked to review. Nothing starts until you click.
        </Typography>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={settings.boardAuthoredPrs}
              onChange={(e) => void onSave({ boardAuthoredPrs: e.target.checked })}
            />
          }
          label="Authored PRs"
        />
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={settings.boardReviewPrs}
              onChange={(e) => void onSave({ boardReviewPrs: e.target.checked })}
            />
          }
          label="Review requested"
        />
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={settings.boardLinkedIssues}
              onChange={(e) => void onSave({ boardLinkedIssues: e.target.checked })}
            />
          }
          label="Linked issues (via PR)"
        />
        <TextField
          fullWidth
          label="Exclude repos"
          value={settings.boardPrExcludeRepos}
          onChange={(e) => void onSave({ boardPrExcludeRepos: e.target.value })}
          helperText="Comma-separated owner/name. Those PRs never appear."
        />
      </Stack>
    </SettingsCard>
  );
}
