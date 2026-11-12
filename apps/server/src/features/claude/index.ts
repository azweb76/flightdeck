import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ClaudeStatus } from "@flightdeck/shared";
import { defaultExec, type ExecFn } from "../exec/index.ts";

type ClaudeSettings = { apiKeyHelper?: string; env?: Record<string, string>; ANTHROPIC_BASE_URL?: string };

export type ClaudeDeps = { exec?: ExecFn; home?: string; env?: NodeJS.ProcessEnv };

export async function detectClaudeConfig(deps: ClaudeDeps = {}): Promise<ClaudeStatus> {
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
  let apiKeyHelperOk: boolean | undefined;
  if (helper) apiKeyHelperOk = await probeHelper(exec, helper, env);
  const found = Boolean(helper || hasKeyEnv);
  return {
    found,
    apiKeyHelper: Boolean(helper),
    apiKeyHelperOk,
    baseUrl,
    sources: [...new Set(sources)],
    detail: summarize({ found, helper: Boolean(helper), apiKeyHelperOk, baseUrl, hasKeyEnv }),
  };
}

export async function startClaudeLogin(exec: ExecFn = defaultExec): Promise<{ ok: boolean; detail: string }> {
  const r = await exec("claude", ["auth", "login"], { timeoutMs: 5_000 });
  if (r.code === 0) return { ok: true, detail: r.stdout.trim() || "Claude login started" };
  return { ok: false, detail: r.stderr.trim() || "Run `claude auth login` in a terminal" };
}

export function claudeSdkEnv(status: ClaudeStatus, env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const next = { ...env };
  if (status.baseUrl) next.ANTHROPIC_BASE_URL = status.baseUrl;
  return next;
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
}): string {
  if (!s.found) return "No apiKeyHelper. Fall back to Claude OAuth login.";
  const parts = [];
  if (s.helper) parts.push(s.apiKeyHelperOk === false ? "apiKeyHelper failed" : "apiKeyHelper found");
  if (s.hasKeyEnv) parts.push("ANTHROPIC_API_KEY is set");
  parts.push(s.baseUrl ? `ANTHROPIC_BASE_URL=${s.baseUrl}` : "ANTHROPIC_BASE_URL not set");
  return parts.join("; ");
}
