import { describe, expect, it } from "vitest";
import { canUseShapeTool, canUseTool, createSdkDriver, mapSdkMessage, SHAPE_TOOLS } from "./sdk.ts";

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

  it("allows AskUserQuestion alongside read-only tools", () => {
    expect(SHAPE_TOOLS).toContain("AskUserQuestion");
    expect(SHAPE_TOOLS).toContain("Read");
  });
});

describe("createSdkDriver abort", () => {
  it("stops the query without an error event when aborted on cap", async () => {
    let aborted = false;
    const driver = createSdkDriver(async function* query(_args: { prompt: string; options?: Record<string, unknown> }) {
      const ac = _args.options?.abortController as AbortController | undefined;
      yield { type: "assistant", message: { content: [{ type: "text", text: "hi" }] } };
      ac?.abort();
      if (ac?.signal.aborted) {
        aborted = true;
        throw new Error("aborted");
      }
      yield { type: "result", total_cost_usd: 1, result: "more" };
    } as never);
    const ac = new AbortController();
    const kinds: string[] = [];
    for await (const ev of driver.run({ prompt: "x", abort: ac.signal })) {
      kinds.push(ev.kind);
      if (ev.kind === "text") ac.abort();
    }
    expect(kinds).toEqual(["text"]);
    expect(kinds).not.toContain("error");
    expect(aborted || ac.signal.aborted).toBe(true);
  });
});

describe("canUseShapeTool", () => {
  it("preserves AskUserQuestion input and denies Write/Edit/Bash", async () => {
    const input = {
      questions: [{ question: "API or UI?", options: [{ id: "api", label: "API" }] }],
    };
    const allowed = await canUseShapeTool("AskUserQuestion", input);
    expect(allowed).toEqual({ behavior: "allow", updatedInput: input });
    expect(allowed).toMatchObject({ behavior: "allow" });
    if (allowed.behavior === "allow") expect(allowed.updatedInput).toBe(input);
    for (const name of ["Write", "Edit", "Bash"] as const) {
      await expect(canUseShapeTool(name, { command: "rm -rf /" })).resolves.toEqual({
        behavior: "deny",
        message: "This session is read-only",
      });
    }
    const write = await canUseTool("implement", "Write", { path: "a.ts" });
    expect(write).toMatchObject({ behavior: "allow" });
    const reviewWrite = await canUseTool("review", "Write", { path: "a.ts" });
    expect(reviewWrite.behavior).toBe("deny");
    const reviewBash = await canUseTool("review", "Bash", { command: "git diff" });
    expect(reviewBash).toEqual({ behavior: "deny", message: "This session is read-only" });
    const prReviewWrite = await canUseTool("pr-review", "Write", { path: "a.ts" });
    expect(prReviewWrite.behavior).toBe("deny");
  });
});
