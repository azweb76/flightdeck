import { FormLabel, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

export function FormField(props: { label: string; hint?: string; children: ReactNode }) {
  return (
    <Stack spacing={0.75} sx={{ mb: 2.5 }}>
      <FormLabel
        sx={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.02em",
          color: "text.secondary",
        }}
      >
        {props.label}
      </FormLabel>
      {props.children}
      {props.hint ? (
        <Typography variant="caption" color="text.secondary">
          {props.hint}
        </Typography>
      ) : null}
    </Stack>
  );
}
