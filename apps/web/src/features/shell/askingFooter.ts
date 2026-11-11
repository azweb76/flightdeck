/** Hide the Agent asking footer on the run page that already shows the question. */
export function hideAskingFooter(pathname: string, askingHref?: string): boolean {
  if (!askingHref) return false;
  return pathname === askingHref || pathname.startsWith(`${askingHref}/`);
}
