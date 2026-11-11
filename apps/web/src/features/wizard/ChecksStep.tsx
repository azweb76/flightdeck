import { Box, Button, Text } from "@primer/react";
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
            borderColor: c.ok ? "border.default" : "attention.emphasis",
            borderRadius: 2,
            p: 3,
            mb: 2,
          }}
        >
          <Text sx={{ fontWeight: 600 }}>
            {c.ok ? "✓" : "!"} {c.title}
          </Text>
          <Text sx={{ display: "block", color: "fg.muted", fontSize: 1, fontFamily: c.hint ? "mono" : "normal" }}>
            {c.hint ?? c.detail}
          </Text>
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
      <Text sx={{ display: "block", mt: 2, fontSize: 0, color: "fg.subtle" }}>
        Fills in repos, label rules, prompts and models.
      </Text>
    </Box>
  );
}
