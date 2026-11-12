import { describe, expect, it } from "vitest";
import { createFakeDriver } from "./fake.ts";

describe("fake shaping driver", () => {
  it("asks on the first turn and fills a draft later", async () => {
    const driver = createFakeDriver();
    const first: string[] = [];
    for await (const ev of driver.run({ prompt: "first turn: export csv" })) first.push(ev.kind);
    expect(first).toContain("ask");
    const kinds: string[] = [];
    let text = "";
    for await (const ev of driver.run({ prompt: "answer: Backend API" })) {
      kinds.push(ev.kind);
      if (ev.detail) text += ev.detail;
    }
    expect(kinds).toContain("done");
    expect(text).toContain("Export invoices as CSV");
  });
});
