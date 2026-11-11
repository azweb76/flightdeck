import { Checkbox, FormControlLabel, Stack, TextField } from "@mui/material";
import type { Settings } from "@flightdeck/shared";
import { SettingsCard } from "./SettingsCard.tsx";

export function AgentSettings({
  settings,
  onSave,
}: {
  settings: Settings;
  onSave: (patch: Partial<Settings>) => Promise<void>;
}) {
  return (
    <SettingsCard title="Agent">
      <Stack spacing={2}>
        <TextField
          fullWidth
          type="number"
          label="Review rounds"
          value={String(settings.reviewRounds)}
          onChange={(e) => void onSave({ reviewRounds: Number(e.target.value) || 2 })}
          helperText="Implement ↔ review loops per run."
        />
        <TextField
          fullWidth
          type="number"
          label="Per-run dollar cap"
          value={String(settings.dollarCapUsd)}
          onChange={(e) => void onSave({ dollarCapUsd: Number(e.target.value) || 10 })}
        />
        <TextField
          fullWidth
          type="number"
          label="Max concurrent agents"
          value={String(settings.maxConcurrency)}
          onChange={(e) => void onSave({ maxConcurrency: Number(e.target.value) || 2 })}
        />
        <FormControlLabel
          control={<Checkbox size="small" checked={settings.prDraft} onChange={(e) => void onSave({ prDraft: e.target.checked })} />}
          label="Open PRs as drafts"
        />
        <TextField
          fullWidth
          label="Clone folder"
          value={settings.workspaceFolder}
          onChange={(e) => void onSave({ workspaceFolder: e.target.value })}
          placeholder="~/.flightdeck/repos"
          helperText="Local directory for gh repo clone."
        />
        {(["modelRefiner", "modelPlanner", "modelImplementer", "modelReviewer"] as const).map((k) => (
          <TextField key={k} fullWidth label={k} value={settings[k]} onChange={(e) => void onSave({ [k]: e.target.value })} />
        ))}
      </Stack>
    </SettingsCard>
  );
}
