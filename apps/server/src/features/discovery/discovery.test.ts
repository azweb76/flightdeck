import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { rememberPick, rememberedPick, rememberedPicks } from "./index.ts";

describe("label repo picks", () => {
  beforeEach(() => {
    resetDbForTests(join(mkdtempSync(join(tmpdir(), "fd-")), "app.sqlite"));
  });
  afterEach(() => closeDb());

  it("remembers a pick per Jira project and label", () => {
    rememberPick("PROJ", "gh:web", "acme", "web");
    rememberPick("PROJ", "gh:api", "acme", "api");
    expect(rememberedPick("PROJ", "gh:web")).toEqual({ owner: "acme", name: "web" });
    expect(rememberedPicks("PROJ")).toEqual({
      "gh:web": { owner: "acme", name: "web" },
      "gh:api": { owner: "acme", name: "api" },
    });
  });
});
