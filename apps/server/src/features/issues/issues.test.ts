import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { loadIssues, upsertIssue } from "./store.ts";

describe("issue store", () => {
  beforeEach(() => {
    resetDbForTests(join(mkdtempSync(join(tmpdir(), "fd-")), "app.sqlite"));
  });
  afterEach(() => closeDb());

  it("lists saved issues newest first", () => {
    upsertIssue({
      id: "jira:PROJ-1",
      source: "jira",
      key: "PROJ-1",
      title: "A",
      body: "",
      url: "",
      updatedAt: "2026-11-10T00:00:00Z",
      saved: true,
    });
    upsertIssue({
      id: "github:acme/web#2",
      source: "github",
      key: "acme/web#2",
      title: "B",
      body: "",
      url: "",
      updatedAt: "2026-11-12T00:00:00Z",
      saved: true,
    });
    expect(loadIssues().map((i) => i.id)).toEqual(["github:acme/web#2", "jira:PROJ-1"]);
  });
});
