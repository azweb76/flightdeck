const PREFIX = "flightdeck-md-draft:";

export function loadDraft(id: string): string | undefined {
  try {
    return localStorage.getItem(PREFIX + id) ?? undefined;
  } catch {
    return undefined;
  }
}

export function saveDraft(id: string, markdown: string): void {
  try {
    localStorage.setItem(PREFIX + id, markdown);
  } catch {
    /* quota */
  }
}

export function clearDraft(id: string): void {
  try {
    localStorage.removeItem(PREFIX + id);
  } catch {
    /* ignore */
  }
}
