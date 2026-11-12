import { IssueDraftSchema, parseAgentJson, type IssueDraft } from "@flightdeck/shared";

export function mergeDraft(current: IssueDraft, text: string): IssueDraft {
  try {
    const parsed = parseAgentJson(text, (v) => IssueDraftSchema.parse(v));
    return IssueDraftSchema.parse({ ...current, ...parsed });
  } catch {
    return current;
  }
}
