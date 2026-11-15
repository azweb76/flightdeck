import type { PopperProps } from "@mui/material/Popper";
import { PICKER_MENU } from "./menu.ts";

export { PICKER_MENU };

/** In-flow menu: takes space under the field so later dialog content cannot paint through it. */
export const pickerPopper = {
  disablePortal: true,
  placement: "bottom-start",
  modifiers: [
    { name: "flip", enabled: false },
    { name: "offset", enabled: false },
    { name: "preventOverflow", enabled: false },
    { name: "computeStyles", options: { adaptive: false, gpuAcceleration: false } },
  ],
  sx: {
    position: "static !important",
    transform: "none !important",
    width: "100%",
    zIndex: PICKER_MENU.zIndex,
  },
} as Partial<PopperProps>;
