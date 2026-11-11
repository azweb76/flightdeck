import { Box, FormControl, Text, TextInput } from "@primer/react";
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
      <Text as="h3" sx={{ fontSize: 2, fontWeight: 600, display: "block", mb: 3 }}>
        Agent
      </Text>
      <Box sx={{ display: "grid", gap: 3 }}>
        <FormControl>
          <FormControl.Label>Review rounds</FormControl.Label>
          <TextInput
            type="number"
            value={String(settings.reviewRounds)}
            onChange={(e) => void onSave({ reviewRounds: Number(e.target.value) || 2 })}
          />
        </FormControl>
        <FormControl>
          <FormControl.Label>Per-run dollar cap</FormControl.Label>
          <TextInput
            type="number"
            value={String(settings.dollarCapUsd)}
            onChange={(e) => void onSave({ dollarCapUsd: Number(e.target.value) || 10 })}
          />
        </FormControl>
        <FormControl>
          <FormControl.Label>Max concurrent agents</FormControl.Label>
          <TextInput
            type="number"
            value={String(settings.maxConcurrency)}
            onChange={(e) => void onSave({ maxConcurrency: Number(e.target.value) || 2 })}
          />
        </FormControl>
        <FormControl>
          <CheckboxRow
            checked={settings.prDraft}
            label="Open PRs as drafts"
            onChange={(prDraft) => void onSave({ prDraft })}
          />
        </FormControl>
        {(["modelRefiner", "modelPlanner", "modelImplementer", "modelReviewer"] as const).map((k) => (
          <FormControl key={k}>
            <FormControl.Label>{k}</FormControl.Label>
            <TextInput value={settings[k]} onChange={(e) => void onSave({ [k]: e.target.value })} />
          </FormControl>
        ))}
      </Box>
    </Box>
  );
}

function CheckboxRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <label>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );
}
