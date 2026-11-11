import { Checkbox, FormControlLabel, Stack, Typography } from "@mui/material";
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
              checked={settings.autoFixCi}
              onChange={(e) => void onSave({ autoFixCi: e.target.checked })}
            />
          }
          label="Auto-fix CI on my PRs (respects spend caps)"
        />
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={settings.autoDraftReviews}
              onChange={(e) => void onSave({ autoDraftReviews: e.target.checked })}
            />
          }
          label="Auto-draft reviews for new review requests"
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
      </Stack>
    </SettingsCard>
  );
}
