import { Button, Tooltip, type ButtonProps, type TooltipProps } from "@mui/material";
import type { PreflightCheck, PreflightGate } from "@flightdeck/shared";
import { usePreflight } from "./PreflightContext.tsx";

export function GatedButton(
  props: ButtonProps & {
    gate: PreflightGate;
    fallbackTitle?: string;
    testId: string;
    placement?: TooltipProps["placement"];
  },
) {
  const { gate, fallbackTitle, testId, disabled, placement = "left", ...rest } = props;
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
        <Button {...rest} key={off ? "off" : "on"} disabled={off} data-testid={testId} />
      </span>
    </Tooltip>
  );
}

const tooltipSlots: TooltipProps["slotProps"] = {
  popper: {
    sx: { zIndex: 1600 },
    modifiers: [
      { name: "offset", options: { offset: [0, 8] } },
      { name: "flip", options: { fallbackPlacements: ["top", "bottom", "right"] } },
      { name: "preventOverflow", options: { padding: 12, altAxis: true } },
    ],
  },
  tooltip: {
    sx: {
      maxWidth: 280,
      fontSize: "0.8rem",
      lineHeight: 1.4,
      bgcolor: "#f5f5f7",
      color: "#1d1d1f",
      border: "1px solid rgba(0,0,0,0.2)",
      boxShadow: 6,
      opacity: "1 !important",
    },
  },
  arrow: { sx: { color: "#f5f5f7" } },
  transition: { timeout: 0 },
};

function tooltipTitle(blocked: PreflightCheck | undefined, fallbackTitle: string | undefined, phaseGated: boolean): string {
  const dep = blocked ? `${blocked.label}: ${blocked.detail}${blocked.fix ? ` Fix: ${blocked.fix}` : ""}` : "";
  if (phaseGated && fallbackTitle) return dep ? `${fallbackTitle}. Also ${dep}` : fallbackTitle;
  return dep || fallbackTitle || "";
}
