import { describe, expect, it } from "vitest";
import { query, type SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { MessageStream, toolResult, userText } from "./stream.ts";

type QueryPrompt = Parameters<typeof query>[0]["prompt"];

describe("Claude Agent SDK query prompt contract", () => {
  it("accepts a string or AsyncIterable<SDKUserMessage> (streaming input)", () => {
    const asString: QueryPrompt = "single-message mode";
    const stream = new MessageStream();
    const asStream: QueryPrompt = stream;
    const msg: SDKUserMessage = userText("hello");
    const result: SDKUserMessage = toolResult("tool-1", "yes");
    expect(asString).toBe("single-message mode");
    expect(asStream).toBe(stream);
    expect(msg.parent_tool_use_id).toBeNull();
    expect(result.message.content).toEqual([
      { type: "tool_result", tool_use_id: "tool-1", content: "yes" },
    ]);
  });
});
