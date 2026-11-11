import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detectClaudeConfig } from "./index.ts";

function homeWithSettings(settings: unknown): string {
  const home = mkdtempSync(join(tmpdir(), "claude-home-"));
  mkdirSync(join(home, ".claude"), { recursive: true });
  writeFileSync(join(home, ".claude", "settings.json"), JSON.stringify(settings));
  return home;
}

describe("detectClaudeConfig", () => {
  it("reads apiKeyHelper and ANTHROPIC_BASE_URL from Claude Code settings", async () => {
    const home = homeWithSettings({
      apiKeyHelper: "echo sk-test",
      env: { ANTHROPIC_BASE_URL: "https://example.invalid" },
    });
    const status = await detectClaudeConfig({
      home,
      env: {},
      exec: async () => ({ stdout: "sk-test\n", stderr: "", code: 0 }),
    });
    expect(status.found).toBe(true);
    expect(status.apiKeyHelper).toBe(true);
    expect(status.apiKeyHelperOk).toBe(true);
    expect(status.baseUrl).toBe("https://example.invalid");
    expect(status.sources.some((s) => s.endsWith("settings.json"))).toBe(true);
  });

  it("accepts ANTHROPIC_API_KEY from the environment", async () => {
    const home = mkdtempSync(join(tmpdir(), "claude-empty-"));
    const status = await detectClaudeConfig({
      home,
      env: { ANTHROPIC_API_KEY: "sk-env", ANTHROPIC_BASE_URL: "https://api.test" },
      exec: async () => ({ stdout: "", stderr: "", code: 1 }),
    });
    expect(status.found).toBe(true);
    expect(status.apiKeyHelper).toBe(false);
    expect(status.baseUrl).toBe("https://api.test");
  });

  it("reports missing config", async () => {
    const home = mkdtempSync(join(tmpdir(), "claude-none-"));
    const status = await detectClaudeConfig({ home, env: {}, exec: async () => ({ stdout: "", stderr: "", code: 1 }) });
    expect(status.found).toBe(false);
    expect(status.detail).toMatch(/No Claude Code/i);
  });

  it("marks a failing apiKeyHelper", async () => {
    const home = homeWithSettings({ apiKeyHelper: "false" });
    const status = await detectClaudeConfig({
      home,
      env: {},
      exec: async () => ({ stdout: "", stderr: "nope", code: 1 }),
    });
    expect(status.found).toBe(true);
    expect(status.apiKeyHelperOk).toBe(false);
  });
});
