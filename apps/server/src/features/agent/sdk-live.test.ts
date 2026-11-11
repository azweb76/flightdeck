import { describe, expect, it } from "vitest";
import { createSdkDriver } from "./sdk.ts";
import { MessageStream, toolResult, userText } from "./stream.ts";

describe("SDK live session (mocked query)", () => {
  it("sends AskUserQuestion results and later user text on the same prompt stream", async () => {
    const seen: unknown[] = [];
    const driver = createSdkDriver(async function* (args) {
      const iter = args.prompt as AsyncIterable<Record<string, unknown>>;
      const reader = iter[Symbol.asyncIterator]();
      const first = await reader.next();
      seen.push(first.value);
      yield {
        type: "assistant",
        session_id: "sess-live",
        message: {
          content: [
            {
              type: "tool_use",
              id: "ask-1",
              name: "AskUserQuestion",
              input: { questions: [{ question: "Use /v2?", options: [{ id: "yes", label: "Yes" }] }] },
            },
          ],
        },
      };
      const second = await reader.next();
      seen.push(second.value);
      const third = await reader.next();
      seen.push(third.value);
      yield { type: "result", session_id: "sess-live", total_cost_usd: 0.2, result: "ok" };
    });

    const stream = new MessageStream();
    stream.push(userText("implement the issue"));
    const events: string[] = [];
    const run = driver.run({
      prompt: stream,
      cwd: ".",
      role: "implementer",
      model: "m",
      permissionMode: "auto",
    });
    const consume = (async () => {
      for await (const ev of run) {
        events.push(ev.kind);
        if (ev.kind === "ask") {
          stream.push(toolResult(ev.ask?.toolUseId ?? "ask-1", "yes"));
          stream.push(userText("also keep the current names"));
          stream.close();
        }
      }
    })();
    await consume;
    expect(events).toContain("ask");
    expect(events).toContain("usage");
    const tool = seen[1] as { message: { content: { type: string; tool_use_id: string }[] } };
    expect(tool.message.content[0]?.type).toBe("tool_result");
    expect(tool.message.content[0]?.tool_use_id).toBe("ask-1");
    const extra = seen[2] as { message: { content: string } };
    expect(extra.message.content).toContain("current names");
  });
});
