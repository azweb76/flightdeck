import { describe, expect, it } from "vitest";
import { mapSdkMessage } from "./sdk.ts";

describe("mapSdkMessage", () => {
  it("maps assistant text and AskUserQuestion", () => {
    const events = [
      ...mapSdkMessage({
        type: "assistant",
        message: {
          content: [
            { type: "text", text: "Looking at the repo" },
            {
              type: "tool_use",
              name: "AskUserQuestion",
              input: { question: "API or UI?", options: [{ id: "api", label: "API" }] },
            },
          ],
        },
      }),
    ];
    expect(events.map((e) => e.kind)).toEqual(["text", "ask"]);
    expect(events[1]?.ask?.options[0]?.label).toBe("API");
  });
});
