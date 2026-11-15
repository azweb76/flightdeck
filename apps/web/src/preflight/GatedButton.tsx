import { Button, Tooltip, type ButtonProps, type TooltipProps } from "@mui/material";
import type { PreflightCheck, PreflightGate } from "@flightdeck/shared";
import { mergeSx } from "../ui/mergeSx.ts";
import { usePreflight } from "./PreflightContext.tsx";

export function GatedButton(
  props: ButtonProps & {
    gate: PreflightGate;
    fallbackTitle?: string;
    testId: string;
    placement?: TooltipProps["placement"];
  },
) {
  const { gate, fallbackTitle, testId, disabled, placement = "left", sx, ...rest } = props;
  const blocked = usePreflight().block(gate);
  const title = tooltipTitle(blocked, fallbackTitle, Boolean(disabled));
  const off = Boolean(blocked) || Boolean(disabled);

  return (
    <Tooltip
      title={title}
      placement={placement}
      arrow
      describeChild
      enterDelay={0}
      enterNextDelay={0}
      leaveDelay={0}
      disableInteractive
      disableHoverListener={!title}
      slotProps={tooltipSlots}
    >
      <span data-testid={`${testId}-gate`} style={{ display: "inline-flex" }}>
        <Button {...rest} disabled={off} data-testid={testId} sx={mergeSx(sx)} />
      </span>
    </Tooltip>
  );
}

const tooltipSlots: TooltipProps["slotProps"] = {
  popper: {
    sx: { zIndex: 1600 },
    modifiers: [
      { name: "offset", options: { offset: [0, 12] } },
      { name: "flip", options: { fallbackPlacements: ["bottom", "top", "right"] } },
      { name: "preventOverflow", options: { padding: 16, altAxis: true, tether: false } },
    ],
  },
  transition: { timeout: 0 },
};

function tooltipTitle(blocked: PreflightCheck | undefined, fallbackTitle: string | undefined, phaseGated: boolean): string {
  const dep = blocked
    ? `${blocked.label}: ${blocked.detail}${blocked.fix ? `\nFix: ${blocked.fix}` : ""}`
    : "";
  if (phaseGated && fallbackTitle) return dep ? `${fallbackTitle}. Also ${dep}` : fallbackTitle;
  return dep || fallbackTitle || "";
}
