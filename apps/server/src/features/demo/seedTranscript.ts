import type { AgentRole, TranscriptEvent } from "@flightdeck/shared";
import { insertEvent } from "../runs/store.ts";

type Draft = Partial<Omit<TranscriptEvent, "id" | "runId">> & {
  kind: TranscriptEvent["kind"];
  title: string;
  role?: AgentRole;
  sessionId?: number;
  min?: number;
};

export function seedAskingTranscript(runId: number, now: string): void {
  const at = (min: number) => new Date(Date.parse(now) - (22 - min) * 60_000).toISOString();
  const rows: Draft[] = [
    ...planner(1),
    ...implementRound1(2),
    ...reviewer(3),
    ...implementRound2(4),
  ];
  for (const row of rows) {
    insertEvent({
      runId,
      sessionId: row.sessionId,
      role: row.role,
      kind: row.kind,
      title: row.title,
      detail: row.detail ?? "",
      tool: row.tool,
      path: row.path,
      tokensIn: row.tokensIn,
      tokensOut: row.tokensOut,
      usd: row.usd,
      at: at(row.min ?? 0),
    });
  }
}

function planner(sessionId: number): Draft[] {
  return [
    t(sessionId, "planner", 1, {
      kind: "text",
      title: "assistant",
      detail:
        "I'll version the public API without a hard break.\n\n## Plan\n1. Keep `/v1` routes.\n2. Add deprecation headers.\n3. Only introduce `/v2` if a client-incompatible change is required.\n",
    }),
    u(sessionId, "planner", 3, 1800, 420, 0.22),
  ];
}

function implementRound1(sessionId: number): Draft[] {
  return [
    t(sessionId, "implementer", 4, {
      kind: "text",
      title: "assistant",
      detail: "Starting with the rate-limit middleware and the deprecation header helper.",
    }),
    tool(sessionId, "implementer", 5, "Read", "src/server.ts"),
    result(sessionId, "implementer", 6, "export function app() {\n  return router;\n}\n"),
    tool(sessionId, "implementer", 7, "Edit", "src/middleware/rateLimit.ts", {
      additions: 12,
      deletions: 3,
      output: "--- a\n+++ b\n-export const windowMs = 60_000\n+export const windowMs = 30_000\n+res.setHeader('Deprecation', 'true')\n",
    }),
    tool(sessionId, "implementer", 8, "Bash", "npm test -- rateLimit", {
      command: "npm test -- rateLimit",
      output: "PASS src/middleware/rateLimit.test.ts\n  4 passed, 0 failed\n",
    }),
    u(sessionId, "implementer", 10, 6400, 1800, 0.71),
  ];
}

function reviewer(sessionId: number): Draft[] {
  return [
    t(sessionId, "reviewer", 11, {
      kind: "text",
      title: "assistant",
      detail: "Looks solid. One open product question: **should new endpoints live under `/v2`?**",
    }),
    u(sessionId, "reviewer", 12, 2100, 500, 0.18),
  ];
}

function implementRound2(sessionId: number): Draft[] {
  return [
    t(sessionId, "implementer", 13, {
      kind: "text",
      title: "user",
      detail: "Prefer headers over a new /v2 if we can.",
    }),
    t(sessionId, "implementer", 14, {
      kind: "text",
      title: "assistant",
      detail: "I'll keep `/v1` and add Sunset/Deprecation headers. Asking once to confirm the public contract.",
    }),
    tool(sessionId, "implementer", 15, "Grep", "router.(get|post)", { input: "router\\\\.(get|post)" }),
    tool(sessionId, "implementer", 16, "Write", "src/http/deprecation.ts", {
      input: "src/http/deprecation.ts",
      output: "export function deprecationHeaders() { return { Deprecation: 'true' } }\n",
    }),
    tool(sessionId, "implementer", 17, "Task", "Check client SDKs for /v2 usage", {
      input: "Scan acme/web for /v2 fetch paths",
    }),
    u(sessionId, "implementer", 20, 4100, 900, 0.49),
  ];
}

function t(sessionId: number, role: AgentRole, min: number, rest: Omit<Draft, "sessionId" | "role" | "min">): Draft {
  return { sessionId, role, min, ...rest };
}

function u(sessionId: number, role: AgentRole, min: number, tokensIn: number, tokensOut: number, usd: number): Draft {
  return { sessionId, role, min, kind: "usage", title: "usage", detail: "", tokensIn, tokensOut, usd };
}

function tool(
  sessionId: number,
  role: AgentRole,
  min: number,
  name: string,
  path: string,
  extra: Record<string, unknown> = {},
): Draft {
  return {
    sessionId,
    role,
    min,
    kind: "tool",
    title: name,
    tool: name,
    path,
    detail: JSON.stringify({ command: extra.command, ...extra }),
  };
}

function result(sessionId: number, role: AgentRole, min: number, output: string): Draft {
  return { sessionId, role, min, kind: "tool_result", title: "result", detail: JSON.stringify({ output }) };
}
