import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Paper, Typography } from "@mui/material";
import type { SetupStatus } from "@flightdeck/shared";
import { api } from "../api/index.ts";
import { ChecksStep } from "./ChecksStep.tsx";
import { JiraStep } from "./JiraStep.tsx";
import { ReposStep } from "./ReposStep.tsx";
import { Stepper } from "./Stepper.tsx";
import { WizardActions } from "./WizardActions.tsx";

export function SetupWizard({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<SetupStatus>();
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    const s = await api.recheck();
    setStatus(s);
    return s;
  }, []);

  useEffect(() => {
    void refresh().catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed"));
  }, [refresh]);

  const checks = status?.checks ?? [];
  const requiredOk = ["git", "gh", "claude"].every((id) => checks.find((c) => c.id === id)?.ok);

  async function finish() {
    setError(undefined);
    try {
      await api.completeSetup();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not finish setup");
    }
  }

  return (
    <Box sx={{ minHeight: "100%", bgcolor: "background.default", display: "flex", justifyContent: "center", py: 6, px: 3 }}>
      <Paper variant="outlined" sx={{ width: "100%", maxWidth: 720, p: 4 }}>
        <Typography variant="h1">Set up</Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          Step {step + 1} of 3
        </Typography>
        <Stepper step={step} />
        {error ? <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert> : null}
        {step === 0 ? <ChecksStep checks={checks} onImported={() => void refresh()} /> : null}
        {step === 1 ? <JiraStep onConnected={() => void refresh()} /> : null}
        {step === 2 ? <ReposStep /> : null}
        <WizardActions
          step={step}
          requiredOk={requiredOk}
          onRecheck={() => void refresh()}
          onBack={() => setStep((s) => s - 1)}
          onNext={() => setStep((s) => s + 1)}
          onFinish={() => void finish()}
        />
      </Paper>
    </Box>
  );
}
