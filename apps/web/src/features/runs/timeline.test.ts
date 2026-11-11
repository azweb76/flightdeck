import { describe, expect, it } from "vitest";
import type { Run, TranscriptEvent } from "@flightdeck/shared";
import { groupTimeline } from "./timeline.ts";
import { formatDuration, lineDelta, parseToolMeta } from "./toolMeta.ts";

function ev(partial: Partial<TranscriptEvent> & Pick<TranscriptEvent, "id" | "kind" | "title">): TranscriptEvent {
  return {
    runId: 1,
    detail: "",
    at: "2026-11-11T12:00:00Z",
    ...partial,
  };
}

describe("groupTimeline", () => {
  it("groups phases and pairs tool results", () => {
    const events = [
      ev({ id: 1, role: "planner", kind: "text", title: "assistant", detail: "Plan." }),
      ev({ id: 2, role: "planner", kind: "usage", title: "usage", tokensIn: 100, usd: 0.1 }),
      ev({ id: 3, role: "implementer", kind: "tool", title: "Edit", tool: "Edit", path: "a.ts", detail: '{"additions":2}' }),
      ev({ id: 4, role: "implementer", kind: "tool_result", title: "result", detail: '{"output":"ok"}' }),
      ev({ id: 5, role: "implementer", kind: "text", title: "user", detail: "Keep /v1" }),
    ];
    const groups = groupTimeline(events, { phase: "implement", status: "asking" } as Run);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.status).toBe("done");
    expect(groups[1]?.status).toBe("running");
    expect(groups[1]?.items.map((i) => i.type)).toEqual(["tool", "user"]);
    expect(groups[1]?.items[0]).toMatchObject({ type: "tool" });
  });
});

describe("toolMeta", () => {
  it("parses JSON detail and line deltas", () => {
    const meta = parseToolMeta(
      ev({ id: 1, kind: "tool", title: "Bash", detail: '{"command":"npm test","output":"ok"}' }),
    );
    expect(meta.command).toBe("npm test");
    expect(lineDelta("a\nb", "a\nc\nd")).toEqual({ additions: 2, deletions: 1 });
    expect(formatDuration("2026-11-11T12:00:00Z", "2026-11-11T12:01:05Z")).toBe("1m 5s");
  });
});
