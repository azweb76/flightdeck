import { Button, Tooltip, type ButtonProps } from "@mui/material";
import type { PreflightGate } from "@flightdeck/shared";
import { usePreflight } from "./PreflightContext.tsx";

export function GatedButton(
  props: ButtonProps & { gate: PreflightGate; fallbackTitle?: string; testId: string },
) {
  const { gate, fallbackTitle, testId, disabled, ...rest } = props;
  const blocked = usePreflight().block(gate);
  const title = blocked
    ? `${blocked.label}: ${blocked.detail}${blocked.fix ? ` Fix: ${blocked.fix}` : ""}`
    : fallbackTitle;
  const off = Boolean(blocked) || Boolean(disabled);

  return (
    <Tooltip
      title={title ?? ""}
      placement="top"
      slotProps={{
        popper: { sx: { zIndex: 1600 } },
        tooltip: {
          sx: {
            maxWidth: 320,
            fontSize: "0.8rem",
            lineHeight: 1.4,
            bgcolor: "text.primary",
            color: "background.default",
          },
        },
      }}
      enterDelay={0}
      enterNextDelay={0}
      disableHoverListener={!title}
    >
      <span data-testid={`${testId}-gate`} style={{ display: "inline-flex" }}>
        <Button {...rest} key={off ? "off" : "on"} disabled={off} data-testid={testId} />
      </span>
    </Tooltip>
  );
}
