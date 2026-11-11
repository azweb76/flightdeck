import { Box, Button, Typography } from "@mui/material";
import type { SetupCheck } from "@flightdeck/shared";
import { useRef } from "react";
import { api } from "../api/index.ts";

export function ChecksStep({
  checks,
  onImported,
}: {
  checks: SetupCheck[];
  onImported: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const shown = checks.filter((c) => c.id === "git" || c.id === "gh" || c.id === "claude");

  async function onFile(file: File) {
    const text = await file.text();
    await api.importConfig(JSON.parse(text) as unknown);
    onImported();
  }

  return (
    <Box>
      {shown.map((c) => (
        <Box
          key={c.id}
          sx={{
            border: "1px solid",
            borderColor: c.ok ? "divider" : "warning.main",
            borderRadius: 1,
            p: 3,
            mb: 2,
          }}
        >
          <Typography sx={{ fontWeight: 600 }}>
            {c.ok ? "✓" : "!"} {c.title}
          </Typography>
          <Typography color="text.secondary" sx={{ fontFamily: c.hint ? "ui-monospace, monospace" : "inherit" }}>
            {c.hint ?? c.detail}
          </Typography>
        </Box>
      ))}
      <input
        ref={input}
        type="file"
        accept="application/json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onFile(file);
        }}
      />
      <Button sx={{ mt: 2 }} onClick={() => input.current?.click()}>
        Import team config…
      </Button>
      <Typography sx={{ display: "block", mt: 2, fontSize: 11, color: "text.secondary" }}>
        Fills in label rules, prompts and models. Pinned team repos become favorites.
      </Typography>
    </Box>
  );
}
