import { Paper, Stack, Typography } from "@mui/material";

export function PlaceholderPage(props: { title: string; phase: string; detail: string }) {
  return (
    <Stack spacing={3}>
      <Typography variant="h4">{props.title}</Typography>
      <Paper sx={{ p: 6, border: 1, borderColor: "divider", textAlign: "center" }} data-testid="placeholder">
        <Typography variant="h6" gutterBottom>
          Coming in {props.phase}
        </Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 480, mx: "auto" }}>
          {props.detail} Goal shaping is ready now on Issues.
        </Typography>
      </Paper>
    </Stack>
  );
}
