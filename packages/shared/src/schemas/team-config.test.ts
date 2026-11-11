import { describe, expect, it } from "vitest";
import { TeamConfigSchema } from "./team-config.ts";

const valid = {
  version: 1 as const,
  repos: [{ owner: "acme", name: "web", pinned: true }],
  labelRules: { prefix: "gh:" },
  prompts: { planner: "plan well" },
  models: { implementer: "claude-opus" },
};

describe("TeamConfigSchema", () => {
  it("accepts a full team config and fills defaults", () => {
    const parsed = TeamConfigSchema.parse(valid);
    expect(parsed.repos[0]?.defaultBranch).toBe("main");
    expect(parsed.labelRules.prefix).toBe("gh:");
    expect(parsed.prompts?.planner).toBe("plan well");
  });

  it("accepts repos-only configs", () => {
    const parsed = TeamConfigSchema.parse({ version: 1, repos: [] });
    expect(parsed.repos).toEqual([]);
  });

  it("rejects the wrong version", () => {
    const r = TeamConfigSchema.safeParse({ ...valid, version: 2 });
    expect(r.success).toBe(false);
  });

  it("rejects unknown keys", () => {
    const r = TeamConfigSchema.safeParse({ ...valid, extra: true });
    expect(r.success).toBe(false);
  });

  it("rejects a repo missing owner/name", () => {
    const r = TeamConfigSchema.safeParse({ version: 1, repos: [{ owner: "acme" }] });
    expect(r.success).toBe(false);
  });

  it("rejects a bad Jira site URL", () => {
    const r = TeamConfigSchema.safeParse({
      version: 1,
      jira: { siteUrl: "not-a-url" },
    });
    expect(r.success).toBe(false);
  });
});
