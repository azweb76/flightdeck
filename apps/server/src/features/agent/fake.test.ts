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
    for await (const ev of driver.run({ prompt: "New idea:\nexport csv\nanswer: Backend API" })) {
      kinds.push(ev.kind);
      if (ev.detail) text += ev.detail;
    }
    expect(kinds).toContain("done");
    expect(text).toMatch(/export csv/i);
  });

  it("builds the question and draft from the actual idea", async () => {
    const driver = createFakeDriver();
    const asks: string[] = [];
    for await (const ev of driver.run({ prompt: "first turn:\nNew idea:\nAdd dark mode to settings" })) {
      if (ev.ask) asks.push(ev.ask.prompt);
    }
    expect(asks[0]).toMatch(/dark mode/i);
    let draft = "";
    for await (const ev of driver.run({
      prompt: "New idea:\nAdd dark mode to settings\nanswer: UI",
    })) {
      if (ev.detail) draft += ev.detail;
    }
    expect(draft).toMatch(/dark mode/i);
    expect(draft).not.toMatch(/Export invoices as CSV/);
  });
});
