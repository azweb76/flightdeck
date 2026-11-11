import { describe, expect, it } from "vitest";
import { createSdkDriver, mapSdkMessage } from "./sdk.ts";

describe("mapSdkMessage", () => {
  it("maps AskUserQuestion tool use to an ask event", () => {
    const events = [
      ...mapSdkMessage({
        type: "assistant",
        session_id: "sess-1",
        message: {
          content: [
            {
              type: "tool_use",
              name: "AskUserQuestion",
              input: {
                questions: [
                  {
                    question: "Use /v2?",
                    options: [
                      { id: "yes", label: "Yes" },
                      { id: "no", label: "No" },
                    ],
                  },
                ],
              },
            },
          ],
        },
      }),
    ];
    expect(events[0]?.kind).toBe("ask");
    expect(events[0]?.ask?.prompt).toBe("Use /v2?");
    expect(events[0]?.ask?.options).toEqual([
      { id: "yes", label: "Yes" },
      { id: "no", label: "No" },
    ]);
    expect(events[0]?.sdkSessionId).toBe("sess-1");
  });

  it("uses SDK total_cost_usd on the result usage event", () => {
    const events = [
      ...mapSdkMessage({
        type: "result",
        session_id: "sess-2",
        total_cost_usd: 0.42,
        usage: { input_tokens: 10, output_tokens: 4 },
        result: "ok",
      }),
    ];
    expect(events[0]).toMatchObject({ kind: "usage", usd: 0.42, tokensIn: 10 });
    expect(events[1]).toMatchObject({ kind: "done", sdkSessionId: "sess-2", detail: "ok" });
  });
});

describe("createSdkDriver", () => {
  it("passes resume into the SDK query options", async () => {
    const seen: Record<string, unknown>[] = [];
    const driver = createSdkDriver(async function* (args) {
      seen.push(args.options);
      yield { type: "result", session_id: "sess-9", total_cost_usd: 0.01, result: "" };
    });
    const events = [];
    for await (const ev of driver.run({
      prompt: "hi",
      cwd: "/tmp",
      role: "implementer",
      model: "claude",
      permissionMode: "auto",
      resumeSessionId: "sess-8",
    })) {
      events.push(ev);
    }
    expect(seen[0]?.resume).toBe("sess-8");
    expect(events.some((e) => e.kind === "usage" && e.usd === 0.01)).toBe(true);
  });
});
