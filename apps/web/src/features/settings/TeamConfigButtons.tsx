import { Button } from "@mui/material";
import { api } from "../api/index.ts";
import { SettingsCard } from "./SettingsCard.tsx";

export function TeamConfigButtons() {
  return (
    <SettingsCard title="Team config">
      <Button
        size="small"
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
    </SettingsCard>
  );
}
