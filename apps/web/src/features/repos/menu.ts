/** One place for repo combobox menu geometry. */
export const PICKER_MENU = {
  minHeight: 240,
  maxHeight: 360,
  header: 52,
  zIndex: 2,
  actionsZIndex: 3,
} as const;

export function listboxMax(room: number): number {
  const hard = PICKER_MENU.maxHeight - PICKER_MENU.header;
  return Math.max(0, Math.min(hard, room));
}

/** Cap the in-flow list to DialogContent so rows cannot sit under DialogActions. */
export function fitPickerMenu(wrap: HTMLDivElement | null): void {
  const content = wrap?.closest(".MuiDialogContent-root");
  const list = wrap?.querySelector("#repo-listbox");
  if (!wrap || !content || !(list instanceof HTMLElement)) return;
  wrap.scrollIntoView({ block: "start" });
  const room = content.getBoundingClientRect().bottom - list.getBoundingClientRect().top;
  list.style.maxHeight = `${listboxMax(room)}px`;
  list.style.minHeight = "0px";
}
