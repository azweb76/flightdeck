import type { PopperProps } from "@mui/material/Popper";

export function capDropdownToActions(paper: HTMLElement | null): void {
  if (!paper) return;
  const dialog = paper.closest(".MuiDialog-paper");
  const actions = dialog?.querySelector(".MuiDialogActions-root");
  const input = dialog?.querySelector("[data-testid=repo-search]");
  const bottom = actions ? actions.getBoundingClientRect().top - 8 : window.innerHeight - 16;
  const top = input ? input.getBoundingClientRect().bottom + 4 : paper.getBoundingClientRect().top;
  const max = Math.min(280, Math.max(8, bottom - top));
  paper.style.maxHeight = `${max}px`;
  const list = paper.querySelector("#repo-listbox");
  if (list instanceof HTMLElement) list.style.maxHeight = `${Math.max(8, max - 52)}px`;
}

function capList({ state }: { state: { elements: { popper: HTMLElement } } }) {
  capDropdownToActions(state.elements.popper);
}

/** Stay under the input and above DialogActions; never flip over fields. */
export const pickerPopper = {
  placement: "bottom-start",
  modifiers: [
    { name: "flip", enabled: false },
    { name: "preventOverflow", enabled: false },
    { name: "offset", options: { offset: [0, 4] } },
    { name: "repoListMaxSize", enabled: true, phase: "beforeWrite", fn: capList },
  ],
} as Partial<PopperProps>;
