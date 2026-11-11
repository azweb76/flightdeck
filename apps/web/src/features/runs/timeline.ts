import type { AgentRole, Run, TranscriptEvent } from "@flightdeck/shared";

export type TimelineItem =
  | { type: "assistant"; event: TranscriptEvent }
  | { type: "user"; event: TranscriptEvent }
  | { type: "tool"; event: TranscriptEvent; result?: TranscriptEvent };

export type PhaseGroup = {
  key: string;
  role: AgentRole | "run";
  events: TranscriptEvent[];
  items: TimelineItem[];
  tokensIn: number;
  tokensOut: number;
  usd: number;
  startedAt: string;
  endedAt: string;
  status: "done" | "running" | "pending";
};

const PHASE_ROLE: Record<string, AgentRole> = {
  plan: "planner",
  implement: "implementer",
  fix: "implementer",
  pr: "implementer",
  review: "reviewer",
  session_review: "session_reviewer",
};

export function groupTimeline(events: TranscriptEvent[], run?: Run): PhaseGroup[] {
  const groups: PhaseGroup[] = [];
  for (const e of events) {
    const role = e.role ?? "run";
    const key = `${role}-${e.sessionId ?? 0}`;
    const last = groups.at(-1);
    if (last && last.key === key) {
      last.events.push(e);
      last.endedAt = e.at;
    } else {
      groups.push({
        key,
        role,
        events: [e],
        items: [],
        tokensIn: 0,
        tokensOut: 0,
        usd: 0,
        startedAt: e.at,
        endedAt: e.at,
        status: "pending",
      });
    }
  }
  for (const g of groups) {
    g.items = toItems(g.events);
    g.tokensIn = g.events.reduce((n, e) => n + (e.tokensIn ?? 0), 0);
    g.tokensOut = g.events.reduce((n, e) => n + (e.tokensOut ?? 0), 0);
    g.usd = g.events.reduce((n, e) => n + (e.usd ?? 0), 0);
    g.status = phaseStatus(g, groups, run);
  }
  return groups;
}

function toItems(events: TranscriptEvent[]): TimelineItem[] {
  const items: TimelineItem[] = [];
  for (let i = 0; i < events.length; i++) {
    const e = events[i]!;
    if (e.kind === "usage" || e.kind === "system") continue;
    if (e.kind === "tool_result") continue;
    if (e.kind === "text" && e.title === "user") {
      items.push({ type: "user", event: e });
      continue;
    }
    if (e.kind === "tool") {
      const next = events[i + 1];
      items.push({ type: "tool", event: e, result: next?.kind === "tool_result" ? next : undefined });
      continue;
    }
    if (e.kind === "text") items.push({ type: "assistant", event: e });
  }
  return items;
}

function phaseStatus(group: PhaseGroup, all: PhaseGroup[], run?: Run): PhaseGroup["status"] {
  const idx = all.indexOf(group);
  if (idx < all.length - 1) return "done";
  if (!run) return "done";
  if (run.status === "completed") return "done";
  const current = PHASE_ROLE[run.phase];
  if (current && group.role !== current && group.role !== "run") return "done";
  if (run.status === "queued" || run.status === "running" || run.status === "asking" || run.status === "paused") {
    return "running";
  }
  return "done";
}
