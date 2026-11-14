import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ClaudeStatus } from "@flightdeck/shared";
import { CACHE_KEYS, getCache, TTL } from "../cache/index.ts";
import { defaultExec, type ExecFn } from "../exec/index.ts";

type ClaudeSettings = { apiKeyHelper?: string; env?: Record<string, string>; ANTHROPIC_BASE_URL?: string };

export type ClaudeDeps = { exec?: ExecFn; home?: string; env?: NodeJS.ProcessEnv };

export const CLAUDE_LOGIN_HINT = "In a terminal run: claude\nThen type /login and finish in the browser.";

export async function detectClaudeConfig(deps: ClaudeDeps = {}): Promise<ClaudeStatus> {
  const custom = Boolean(deps.home || deps.env || deps.exec);
  if (!custom) {
    return getCache().get(CACHE_KEYS.claudeConfig, () => readClaudeConfig(deps), TTL.claudeConfig);
  }
  return readClaudeConfig(deps);
}

async function readClaudeConfig(deps: ClaudeDeps): Promise<ClaudeStatus> {
  const home = deps.home ?? homedir();
  const env = deps.env ?? process.env;
  const exec = deps.exec ?? defaultExec;
  const sources: string[] = [];
  const merged = loadSettings(settingsFiles(home), sources);
  const helper = firstString(env.CLAUDE_CODE_API_KEY_HELPER, merged.apiKeyHelper);
  if (env.CLAUDE_CODE_API_KEY_HELPER) sources.push("env:CLAUDE_CODE_API_KEY_HELPER");
  if (merged.apiKeyHelper) sources.push("settings:apiKeyHelper");
  const baseUrl = firstString(env.ANTHROPIC_BASE_URL, merged.env?.ANTHROPIC_BASE_URL, merged.ANTHROPIC_BASE_URL);
  if (env.ANTHROPIC_BASE_URL) sources.push("env:ANTHROPIC_BASE_URL");
  if (merged.env?.ANTHROPIC_BASE_URL || merged.ANTHROPIC_BASE_URL) sources.push("settings:ANTHROPIC_BASE_URL");
  const hasKeyEnv = Boolean(env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY);
  if (hasKeyEnv) sources.push("env:ANTHROPIC_API_KEY");
  const oauth = oauthPresent(home, sources);
  let apiKeyHelperOk: boolean | undefined;
  if (helper) apiKeyHelperOk = await probeHelper(exec, helper, env);
  const found = Boolean(helper || hasKeyEnv || oauth);
  return {
    found,
    apiKeyHelper: Boolean(helper),
    apiKeyHelperOk,
    oauth,
    loginHint: CLAUDE_LOGIN_HINT,
    baseUrl,
    sources: [...new Set(sources)],
    detail: summarize({ found, helper: Boolean(helper), apiKeyHelperOk, baseUrl, hasKeyEnv, oauth }),
  };
}

export function claudeLoginInstructions(): { ok: true; detail: string } {
  return { ok: true, detail: CLAUDE_LOGIN_HINT };
}

export function claudeSdkEnv(status: ClaudeStatus, env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const next = { ...env };
  if (status.baseUrl) next.ANTHROPIC_BASE_URL = status.baseUrl;
  return next;
}

function oauthPresent(home: string, sources: string[]): boolean {
  const files = [
    join(home, ".claude", ".credentials.json"),
    join(home, ".claude", "credentials.json"),
    join(home, ".config", "claude", ".credentials.json"),
    join(home, ".claude.json"),
  ];
  return files.some((file) => {
    if (!existsSync(file)) return false;
    sources.push(file);
    return true;
  });
}

function settingsFiles(home: string): string[] {
  return [
    join(home, ".claude", "settings.json"),
    join(home, ".claude", "settings.local.json"),
    join(home, ".config", "claude", "settings.json"),
  ];
}

function loadSettings(files: string[], sources: string[]): ClaudeSettings {
  const merged: ClaudeSettings = {};
  for (const file of files) {
    if (!existsSync(file)) continue;
    try {
      const raw = JSON.parse(readFileSync(file, "utf8")) as ClaudeSettings;
      sources.push(file);
      if (raw.apiKeyHelper) merged.apiKeyHelper = raw.apiKeyHelper;
      if (raw.ANTHROPIC_BASE_URL) merged.ANTHROPIC_BASE_URL = raw.ANTHROPIC_BASE_URL;
      if (raw.env) merged.env = { ...merged.env, ...raw.env };
    } catch {
      sources.push(`${file} (unreadable)`);
    }
  }
  return merged;
}

async function probeHelper(exec: ExecFn, helper: string, env: NodeJS.ProcessEnv): Promise<boolean> {
  const r = await exec("sh", ["-c", helper], { timeoutMs: 8_000, env });
  return r.code === 0 && r.stdout.trim().length > 0;
}

function firstString(...vals: (string | undefined)[]): string | undefined {
  return vals.find((v) => v && v.length > 0);
}

function summarize(s: {
  found: boolean;
  helper: boolean;
  apiKeyHelperOk?: boolean;
  baseUrl?: string;
  hasKeyEnv: boolean;
  oauth: boolean;
}): string {
  if (!s.found) return `No apiKeyHelper or Claude login. ${CLAUDE_LOGIN_HINT}`;
  const parts = [];
  if (s.helper) parts.push(s.apiKeyHelperOk === false ? "apiKeyHelper failed" : "apiKeyHelper found");
  if (s.hasKeyEnv) parts.push("ANTHROPIC_API_KEY is set");
  if (s.oauth) parts.push("Claude OAuth login found");
  parts.push(s.baseUrl ? `ANTHROPIC_BASE_URL=${s.baseUrl}` : "ANTHROPIC_BASE_URL not set");
  return parts.join("; ");
}
