import { Box, Stack, Typography } from "@mui/material";

const STEPS = ["Checks", "Connect Jira", "Add repos"];

export function Stepper({ step }: { step: number }) {
  return (
    <Stack direction="row" spacing={3} sx={{ mb: 4, flexWrap: "wrap" }}>
      {STEPS.map((label, i) => (
        <Stack key={label} direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              bgcolor: i === step ? "primary.main" : "background.default",
              color: i === step ? "primary.contrastText" : "text.secondary",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              border: "1px solid",
              borderColor: i === step ? "primary.main" : "divider",
            }}
          >
            {i + 1}
          </Box>
          <Typography sx={{ fontWeight: i === step ? 600 : 400 }}>{label}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}
