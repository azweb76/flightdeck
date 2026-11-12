import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { claudeSdkEnv, detectClaudeConfig } from "./index.ts";

describe("detectClaudeConfig", () => {
  it("reads apiKeyHelper and ANTHROPIC_BASE_URL from ~/.claude/settings.json", async () => {
    const home = mkdtempSync(join(tmpdir(), "claude-"));
    mkdirSync(join(home, ".claude"));
    writeFileSync(
      join(home, ".claude", "settings.json"),
      JSON.stringify({ apiKeyHelper: "echo sk-test", env: { ANTHROPIC_BASE_URL: "https://api.example" } }),
    );
    const status = await detectClaudeConfig({
      home,
      env: {},
      exec: async () => ({ code: 0, stdout: "sk-test\n", stderr: "" }),
    });
    expect(status.found).toBe(true);
    expect(status.apiKeyHelper).toBe(true);
    expect(status.apiKeyHelperOk).toBe(true);
    expect(status.baseUrl).toBe("https://api.example");
    expect(claudeSdkEnv(status).ANTHROPIC_BASE_URL).toBe("https://api.example");
  });

  it("falls back to OAuth when no helper is set", async () => {
    const home = mkdtempSync(join(tmpdir(), "claude-"));
    const status = await detectClaudeConfig({ home, env: {}, exec: async () => ({ code: 1, stdout: "", stderr: "" }) });
    expect(status.found).toBe(false);
    expect(status.apiKeyHelper).toBe(false);
    expect(status.detail).toMatch(/OAuth/);
  });
});
