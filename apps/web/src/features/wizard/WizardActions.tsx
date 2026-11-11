import { Box, Button } from "@primer/react";

export function WizardActions({
  step,
  requiredOk,
  onBack,
  onNext,
  onRecheck,
  onFinish,
}: {
  step: number;
  requiredOk: boolean;
  onBack: () => void;
  onNext: () => void;
  onRecheck: () => void;
  onFinish: () => void;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 2,
        justifyContent: "flex-end",
        mt: 4,
        pt: 3,
        borderTop: "1px solid",
        borderColor: "border.muted",
      }}
    >
      {step === 0 ? (
        <Button onClick={onRecheck}>Re-check</Button>
      ) : (
        <Button onClick={onBack}>Back</Button>
      )}
      {step < 2 ? (
        <Button variant="primary" disabled={step === 0 && !requiredOk} onClick={onNext}>
          Next
        </Button>
      ) : (
        <Button variant="primary" onClick={onFinish}>
          Finish
        </Button>
      )}
    </Box>
  );
}
