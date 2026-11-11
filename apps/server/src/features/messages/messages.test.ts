import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { insertMessage, takeMessages } from "./index.ts";

describe("run messages", () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fd-"));
    resetDbForTests(join(dir, "app.sqlite"));
  });
  afterEach(() => closeDb());

  it("on resume injects current and keeps run-wide constraints", () => {
    insertMessage(1, { target: "current", text: "fix the name" });
    insertMessage(1, { target: "next", text: "prefer /v2" });
    insertMessage(1, { target: "run", text: "no new deps" });
    expect(takeMessages(1, "resume")).toEqual(["[current] fix the name", "[run] no new deps"]);
    expect(takeMessages(1, "resume")).toEqual(["[run] no new deps"]);
  });

  it("on next-phase start injects next (and leftover current)", () => {
    insertMessage(1, { target: "next", text: "prefer /v2" });
    insertMessage(1, { target: "run", text: "no new deps" });
    expect(takeMessages(1, "start")).toEqual(["[next] prefer /v2", "[run] no new deps"]);
    expect(takeMessages(1, "start")).toEqual(["[run] no new deps"]);
  });
});
