/** Hide the Agent asking footer on Next (the inbox row) or the run that owns the question. */
export function hideAskingFooter(pathname: string, askingHref?: string): boolean {
  if (!askingHref) return false;
  if (pathname === "/") return true;
  return pathname === askingHref || pathname.startsWith(`${askingHref}/`);
}
