import type { ChangeEvent, ChatMessage } from "@flightdeck/shared";

export type ChatOption = { id: string; label: string };

export type ChatEntry =
  | {
      type: "bubble";
      id: string;
      mine: boolean;
      caption: string;
      body: string;
      kindTestId?: string;
      options?: ChatOption[];
      optionTestId: (id: string) => string;
      lockPick?: boolean;
    }
  | { type: "stage"; id: string; title: string; detail?: string }
  | { type: "usage"; id: string; text: string };

export function fromMessages(messages: ChatMessage[]): ChatEntry[] {
  return messages.map((m) => ({
    type: "bubble" as const,
    id: m.id,
    mine: m.role === "user",
    caption: m.role === "user" ? "You" : "Claude",
    body: visibleText(m.text),
    options: m.options,
    optionTestId: (id: string) => `option-${id}`,
    lockPick: true,
  }));
}

export function fromEvents(events: ChangeEvent[]): ChatEntry[] {
  return events.map((ev) => {
    if (ev.kind === "stage") return { type: "stage", id: ev.id, title: ev.title, detail: ev.detail };
    if (ev.kind === "usage") {
      return {
        type: "usage",
        id: ev.id,
        text: ev.detail ?? (ev.costUsd != null ? `$${ev.costUsd.toFixed(2)}` : "usage"),
      };
    }
    const mine = ev.kind === "user";
    return {
      type: "bubble" as const,
      id: ev.id,
      mine,
      caption: mine ? "You" : ev.title,
      body: ev.detail && ev.detail !== ev.title ? ev.detail : "",
      kindTestId: `event-${ev.kind}`,
      options: ev.ask?.options,
      optionTestId: (id: string) => `run-option-${id}`,
    };
  });
}

function visibleText(text: string): string {
  return text.replace(/```json[\s\S]*?```/g, "").trim() || "Updated the draft.";
}
