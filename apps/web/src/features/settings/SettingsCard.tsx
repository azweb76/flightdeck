import type { ReactNode } from "react";
import { Card, CardContent, Divider, Typography } from "@mui/material";

export function SettingsCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card variant="outlined" sx={{ mt: 2 }}>
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Typography variant="h3" sx={{ mb: 2 }}>
          {title}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {children}
      </CardContent>
    </Card>
  );
}
