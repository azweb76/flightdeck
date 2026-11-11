import { Box, Text } from "@primer/react";

const STEPS = ["Checks", "Connect Jira", "Add repos"];

export function Stepper({ step }: { step: number }) {
  return (
    <Box sx={{ display: "flex", gap: 3, mb: 4, flexWrap: "wrap" }}>
      {STEPS.map((label, i) => (
        <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              bg: i === step ? "accent.emphasis" : "canvas.subtle",
              color: i === step ? "fg.onEmphasis" : "fg.muted",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              fontSize: 1,
              border: "1px solid",
              borderColor: i === step ? "accent.emphasis" : "border.default",
            }}
          >
            {i + 1}
          </Box>
          <Text sx={{ fontWeight: i === step ? 600 : 400 }}>{label}</Text>
        </Box>
      ))}
    </Box>
  );
}
