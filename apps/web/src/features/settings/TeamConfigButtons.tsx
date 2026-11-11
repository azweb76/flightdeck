import { Box, Button } from "@primer/react";
import { api } from "../api/index.ts";

export function TeamConfigButtons() {
  return (
    <Box sx={{ display: "flex", gap: 2, mt: 4 }}>
      <Button
        onClick={() => {
          void api.exportConfig().then((cfg) => {
            const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "flightdeck-team-config.json";
            a.click();
          });
        }}
      >
        Export team config
      </Button>
    </Box>
  );
}
