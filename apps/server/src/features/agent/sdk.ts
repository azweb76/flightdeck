import type { SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import type { AgentDriver, AgentEvent, AgentRunOpts } from "./types.ts";
import { allowTool } from "./permissions.ts";
import { resultDetail, toolDetail, toolPath } from "./tool-meta.ts";

type SdkQuery = (args: {
  prompt: string | AsyncIterable<SDKUserMessage>;
  options?: Record<string, unknown>;
}) => AsyncIterable<Record<string, unknown>>;

/** Real Claude Agent SDK driver. Uses permissionMode auto when the SDK supports it. */
export function createSdkDriver(queryFn?: SdkQuery): AgentDriver {
  return {
    async *run(opts: AgentRunOpts): AsyncIterable<AgentEvent> {
      const query = queryFn ?? (await loadQuery());
      const handle = query({
        prompt: opts.prompt as string | AsyncIterable<SDKUserMessage>,
        options: {
          cwd: opts.cwd,
          model: opts.model,
          permissionMode: opts.permissionMode,
          settingSources: ["user", "project"],
          allowedTools: ["Read", "Edit", "Write", "Glob", "Grep", "Bash", "Agent", "AskUserQuestion"],
          ...(opts.resumeSessionId ? { resume: opts.resumeSessionId } : {}),
          canUseTool: async (name: string, input: Record<string, unknown>) => {
            if (!allowTool(name, input)) {
              return { behavior: "deny", message: "Blocked by Flightdeck allowlist" };
            }
            return { behavior: "allow", updatedInput: input };
          },
        },
      });
      const interrupt = () => {
        void (handle as { interrupt?: () => Promise<void> }).interrupt?.();
      };
      opts.abort?.addEventListener("abort", interrupt);
      try {
        for await (const msg of handle) {
          if (opts.abort?.aborted) {
            interrupt();
            yield { kind: "error", title: "aborted", detail: "session aborted" };
            return;
          }
          yield* mapSdkMessage(msg);
        }
      } finally {
        opts.abort?.removeEventListener("abort", interrupt);
      }
    },
  };
}

async function loadQuery(): Promise<SdkQuery> {
  const mod = (await import("@anthropic-ai/claude-agent-sdk")) as { query: SdkQuery };
  return mod.query;
}

export function* mapSdkMessage(msg: Record<string, unknown>): Generator<AgentEvent> {
  const sessionId = typeof msg.session_id === "string" ? msg.session_id : undefined;
  const type = String(msg.type ?? "");
  if (type === "assistant") {
    yield* mapAssistant(msg, sessionId);
    return;
  }
  if (type === "user") {
    yield* mapUser(msg, sessionId);
    return;
  }
  if (type === "result") {
    yield* mapResult(msg, sessionId);
  }
}

function* mapAssistant(msg: Record<string, unknown>, sessionId?: string): Generator<AgentEvent> {
  const content = (msg.message as { content?: unknown[] } | undefined)?.content ?? [];
  for (const part of content) {
    const p = part as {
      type?: string;
      text?: string;
      name?: string;
      input?: Record<string, unknown>;
    };
    if (p.type === "text" && p.text) {
      yield { kind: "text", title: "assistant", detail: p.text, sdkSessionId: sessionId };
    }
    if (p.type === "tool_use" && isAskTool(p.name)) {
      const part = p as { id?: string };
      yield askFromTool(p.input ?? {}, sessionId, part.id);
      continue;
    }
    if (p.type === "tool_use") {
      yield {
        kind: "tool",
        title: p.name ?? "tool",
        tool: p.name,
        path: toolPath(p.input ?? {}),
        detail: toolDetail(p.name, p.input ?? {}),
        sdkSessionId: sessionId,
      };
    }
  }
}

function* mapUser(msg: Record<string, unknown>, sessionId?: string): Generator<AgentEvent> {
  const content = (msg.message as { content?: unknown[] } | undefined)?.content ?? [];
  for (const part of content) {
    const p = part as { type?: string; content?: unknown; tool_use_id?: string };
    if (p.type !== "tool_result") continue;
    yield {
      kind: "tool_result",
      title: "result",
      detail: resultDetail(p.content),
      sdkSessionId: sessionId,
    };
  }
}

function* mapResult(msg: Record<string, unknown>, sessionId?: string): Generator<AgentEvent> {
  const usage = msg.usage as { input_tokens?: number; output_tokens?: number } | undefined;
  const usd = typeof msg.total_cost_usd === "number" ? msg.total_cost_usd : undefined;
  yield {
    kind: "usage",
    title: "usage",
    tokensIn: usage?.input_tokens,
    tokensOut: usage?.output_tokens,
    usd,
    sdkSessionId: sessionId,
  };
  yield {
    kind: "done",
    title: "session finished",
    detail: String(msg.result ?? ""),
    sdkSessionId: sessionId,
  };
}

function isAskTool(name: string | undefined): boolean {
  return name === "AskUserQuestion" || name === "AskUser";
}

function askFromTool(input: Record<string, unknown>, sessionId?: string, toolUseId?: string): AgentEvent {
  const questions = Array.isArray(input.questions) ? input.questions : [input];
  const prompts: string[] = [];
  const options: { id: string; label: string }[] = [];
  for (const raw of questions) {
    const q = raw as { question?: string; prompt?: string; options?: { id?: string; label?: string }[] };
    prompts.push(String(q.question ?? q.prompt ?? ""));
    for (const [i, o] of (q.options ?? []).entries()) {
      options.push({ id: o.id ?? `opt-${options.length}-${i}`, label: o.label ?? String(i) });
    }
  }
  return {
    kind: "ask",
    title: "Need a decision",
    ask: {
      prompt: prompts.filter(Boolean).join("\n") || String(input.question ?? "Need a decision"),
      options: options.length ? options : [{ id: "ok", label: "Continue" }],
      toolUseId,
    },
    sdkSessionId: sessionId,
  };
}
