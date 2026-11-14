import { Alert, Box, MenuItem, Paper, Select, Stack, TextField, Typography } from "@mui/material";
import type { Settings } from "@flightdeck/shared";
import { useState } from "react";
import { FormField } from "../ui/FormField.tsx";

export function CapsForm(props: { settings: Settings; onSaved: (p: Partial<Settings>) => Promise<void> }) {
  const [run, setRun] = useState(String(props.settings.dollarCapUsd));
  const [daily, setDaily] = useState(String(props.settings.dailyDollarCapUsd));
  const [max, setMax] = useState(String(props.settings.maxConcurrentAgents));
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  function editCap(setValue: (v: string) => void, raw: string) {
    setValue(raw);
    setErr("");
    setOk("");
  }

  async function saveNum(key: "dollarCapUsd" | "dailyDollarCapUsd" | "maxConcurrentAgents", raw: string) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) {
      setErr("Enter a number greater than 0");
      setOk("");
      return;
    }
    setErr("");
    await props.onSaved({ [key]: n });
    setOk("Caps saved");
  }

  return (
    <Paper sx={{ p: 4, border: 1, borderColor: "divider" }}>
      <Typography variant="h6" sx={{ mb: 3 }}>
        Spend and concurrency
      </Typography>
      {err ? (
        <Alert severity="error" sx={{ mb: 2 }} data-testid="cap-error">
          {err}
        </Alert>
      ) : null}
      {ok ? (
        <Alert severity="success" sx={{ mb: 2 }} data-testid="cap-saved">
          {ok}
        </Alert>
      ) : null}
      <Stack direction={{ xs: "column", sm: "row" }} gap={2} sx={{ mb: 2 }}>
        <CapField label="Per-run cap (USD)" value={run} testId="cap-run" onChange={(v) => editCap(setRun, v)} onBlur={() => void saveNum("dollarCapUsd", run)} />
        <CapField label="Daily cap (USD)" value={daily} testId="cap-daily" onChange={(v) => editCap(setDaily, v)} onBlur={() => void saveNum("dailyDollarCapUsd", daily)} />
        <CapField label="Max concurrent" value={max} testId="cap-concurrent" onChange={(v) => editCap(setMax, v)} onBlur={() => void saveNum("maxConcurrentAgents", max)} />
      </Stack>
      <Box sx={{ maxWidth: 280 }}>
        <FormField label="Appearance">
          <Select value={props.settings.theme} onChange={(e) => void props.onSaved({ theme: e.target.value as Settings["theme"] })} data-testid="theme-select">
            <MenuItem value="system">System</MenuItem>
            <MenuItem value="light">Light</MenuItem>
            <MenuItem value="dark">Dark</MenuItem>
          </Select>
        </FormField>
      </Box>
    </Paper>
  );
}

function CapField(props: {
  label: string;
  value: string;
  testId: string;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  return (
    <Box sx={{ width: { sm: 180 } }}>
      <FormField label={props.label}>
        <TextField
          type="number"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          onBlur={props.onBlur}
          inputProps={{ "data-testid": props.testId }}
        />
      </FormField>
    </Box>
  );
}
