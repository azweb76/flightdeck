import { Paper, Stack, Typography } from "@mui/material";

export function PlaceholderPage(props: { title: string; phase: string }) {
  return (
    <Stack spacing={3}>
      <Typography variant="h4">{props.title}</Typography>
      <Paper sx={{ p: 5, border: 1, borderColor: "divider" }}>
        <Typography color="text.secondary" sx={{ maxWidth: 520 }}>
          Nothing here yet. {props.title} lands in {props.phase}. Goal shaping is on Issues.
        </Typography>
      </Paper>
    </Stack>
  );
}
