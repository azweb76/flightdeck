import { Box, Checkbox, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import type { Settings } from "@flightdeck/shared";

export function AgentSettings({
  settings,
  onSave,
}: {
  settings: Settings;
  onSave: (patch: Partial<Settings>) => Promise<void>;
}) {
  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h3" sx={{ mb: 3 }}>
        Agent
      </Typography>
      <Stack spacing={3}>
        <TextField
          type="number"
          label="Review rounds"
          value={String(settings.reviewRounds)}
          onChange={(e) => void onSave({ reviewRounds: Number(e.target.value) || 2 })}
        />
        <TextField
          type="number"
          label="Per-run dollar cap"
          value={String(settings.dollarCapUsd)}
          onChange={(e) => void onSave({ dollarCapUsd: Number(e.target.value) || 10 })}
        />
        <TextField
          type="number"
          label="Max concurrent agents"
          value={String(settings.maxConcurrency)}
          onChange={(e) => void onSave({ maxConcurrency: Number(e.target.value) || 2 })}
        />
        <FormControlLabel
          control={
            <Checkbox checked={settings.prDraft} onChange={(e) => void onSave({ prDraft: e.target.checked })} />
          }
          label="Open PRs as drafts"
        />
        {(["modelRefiner", "modelPlanner", "modelImplementer", "modelReviewer"] as const).map((k) => (
          <TextField key={k} label={k} value={settings[k]} onChange={(e) => void onSave({ [k]: e.target.value })} />
        ))}
      </Stack>
    </Box>
  );
}
