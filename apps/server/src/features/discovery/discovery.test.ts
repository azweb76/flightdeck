import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { rememberPick, rememberedPick } from "./index.ts";

describe("project repo picks", () => {
  beforeEach(() => {
    resetDbForTests(join(mkdtempSync(join(tmpdir(), "fd-")), "app.sqlite"));
  });
  afterEach(() => closeDb());

  it("remembers a pick per Jira project", () => {
    rememberPick("PROJ", "acme", "web");
    expect(rememberedPick("PROJ")).toEqual({ owner: "acme", name: "web" });
  });
});
