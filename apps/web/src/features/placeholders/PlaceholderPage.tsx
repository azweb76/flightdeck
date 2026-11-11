import { Box, Typography } from "@mui/material";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h2">{title}</Typography>
      <Typography color="text.secondary" sx={{ mt: 2 }}>
        This page has no extra content.
      </Typography>
    </Box>
  );
}
