import { useEffect, useState } from "react";
import { Typography } from "@mui/material";
import type { PrSyncDiag } from "@flightdeck/shared";
import { api } from "../api/index.ts";
import { SettingsCard } from "./SettingsCard.tsx";

export function Diagnostics() {
  const [diag, setDiag] = useState<PrSyncDiag>();
  useEffect(() => {
    void api.prDiagnostics().then(setDiag).catch(() => undefined);
  }, []);
  const row = diag ?? { authored: 0, reviewRequested: 0, total: 0 };
  return (
    <SettingsCard title="Diagnostics">
      <Typography variant="body2" sx={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12 }}>
        PR sync {row.syncedAt ?? "never"}
      </Typography>
      <Typography variant="body2" sx={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12 }}>
        viewer {row.viewerLogin ?? "—"} · authored {row.authored} · review-requested {row.reviewRequested} · total {row.total}
      </Typography>
      {row.query ? (
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, wordBreak: "break-word" }}>
          {row.query}
        </Typography>
      ) : null}
      {row.error ? (
        <Typography variant="body2" color="error" sx={{ fontSize: 12, wordBreak: "break-word" }}>
          {row.error}
        </Typography>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
          Last PR sync had no error.
        </Typography>
      )}
    </SettingsCard>
  );
}
