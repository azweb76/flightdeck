import { Checkbox, FormControlLabel, Stack } from "@mui/material";
import type { Settings } from "@flightdeck/shared";
import { FormField } from "../../ui/components/form-field/index.ts";
import { SettingsCard } from "./SettingsCard.tsx";

const MODELS = ["modelRefiner", "modelPlanner", "modelImplementer", "modelReviewer"] as const;

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
        <FormField
          type="number"
          label="Review rounds"
          value={String(settings.reviewRounds)}
          onChange={(e) => void onSave({ reviewRounds: Number(e.target.value) || 2 })}
          helperText="Implement ↔ review loops per run."
        />
        <FormField
          type="number"
          label="Per-run dollar cap"
          value={String(settings.dollarCapUsd)}
          onChange={(e) => void onSave({ dollarCapUsd: Number(e.target.value) || 10 })}
        />
        <FormField
          type="number"
          label="Max concurrent agents"
          value={String(settings.maxConcurrency)}
          onChange={(e) => void onSave({ maxConcurrency: Number(e.target.value) || 2 })}
        />
        <FormControlLabel
          control={<Checkbox size="small" checked={settings.prDraft} onChange={(e) => void onSave({ prDraft: e.target.checked })} />}
          label="Open PRs as drafts"
        />
        <FormField
          label="Clone folder"
          value={settings.workspaceFolder}
          onChange={(e) => void onSave({ workspaceFolder: e.target.value })}
          placeholder="~/.flightdeck/repos"
          helperText="Local directory for gh repo clone."
        />
        {MODELS.map((k) => (
          <FormField key={k} label={k} value={settings[k]} onChange={(e) => void onSave({ [k]: e.target.value })} />
        ))}
      </Stack>
    </SettingsCard>
  );
}
