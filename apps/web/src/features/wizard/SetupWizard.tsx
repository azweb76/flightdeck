import { useCallback, useEffect, useState } from "react";
import { Box, Heading, Text } from "@primer/react";
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
    <Box
      sx={{
        minHeight: "100%",
        bg: "canvas.subtle",
        display: "flex",
        justifyContent: "center",
        py: [4, 6],
        px: 3,
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 720,
          bg: "canvas.default",
          border: "1px solid",
          borderColor: "border.default",
          borderRadius: 3,
          p: [3, 4],
        }}
      >
        <Heading as="h1">Set up</Heading>
        <Text sx={{ color: "fg.muted", display: "block", mb: 4 }}>Step {step + 1} of 3</Text>
        <Stepper step={step} />
        {error ? <Text sx={{ color: "danger.fg", display: "block", mb: 3 }}>{error}</Text> : null}
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
      </Box>
    </Box>
  );
}
