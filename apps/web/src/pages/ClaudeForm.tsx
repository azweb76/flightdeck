import { Box, MenuItem, Paper, Select, Typography } from "@mui/material";
import { CLAUDE_LOGIN_HINT, DEFAULT_MODEL, type Settings } from "@flightdeck/shared";
import { FormField } from "../ui/FormField.tsx";

export function ClaudeForm(props: { settings: Settings; onSaved: (p: Partial<Settings>) => Promise<void> }) {
  return (
    <Paper sx={{ p: 4, border: 1, borderColor: "divider" }} data-testid="claude-form">
      <Typography variant="h6" sx={{ mb: 1 }}>
        Claude
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, whiteSpace: "pre-wrap" }} data-testid="claude-login-hint">
        {CLAUDE_LOGIN_HINT}
      </Typography>
      <Box sx={{ maxWidth: 360 }}>
        <FormField label="Model">
          <Select
            value={props.settings.model}
            onChange={(e) => void props.onSaved({ model: e.target.value })}
            data-testid="claude-model"
          >
            <MenuItem value={DEFAULT_MODEL}>{DEFAULT_MODEL}</MenuItem>
            <MenuItem value="claude-opus-4-5">claude-opus-4-5</MenuItem>
          </Select>
        </FormField>
      </Box>
    </Paper>
  );
}
