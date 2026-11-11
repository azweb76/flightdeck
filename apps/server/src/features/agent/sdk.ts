import type { AgentDriver, AgentEvent, AgentRunOpts } from "./types.ts";
import { allowTool } from "./permissions.ts";

type SdkQuery = (args: {
  prompt: string;
  options: Record<string, unknown>;
}) => AsyncIterable<Record<string, unknown>>;

/** Real Claude Agent SDK driver. Uses permissionMode auto when the SDK supports it. */
export function createSdkDriver(queryFn?: SdkQuery): AgentDriver {
  return {
    async *run(opts: AgentRunOpts): AsyncIterable<AgentEvent> {
      const query = queryFn ?? (await loadQuery());
      const stream = query({
        prompt: opts.prompt,
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
      for await (const msg of stream) {
        if (opts.abort?.aborted) {
          yield { kind: "error", title: "aborted", detail: "session aborted" };
          return;
        }
        yield* mapSdkMessage(msg);
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
      yield askFromTool(p.input ?? {}, sessionId);
      continue;
    }
    if (p.type === "tool_use") {
      yield {
        kind: "tool",
        title: p.name ?? "tool",
        tool: p.name,
        path: typeof p.input?.path === "string" ? p.input.path : undefined,
        sdkSessionId: sessionId,
      };
    }
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

function askFromTool(input: Record<string, unknown>, sessionId?: string): AgentEvent {
  const questions = Array.isArray(input.questions) ? input.questions : [input];
  const first = (questions[0] ?? {}) as {
    question?: string;
    prompt?: string;
    options?: { id?: string; label?: string }[];
  };
  const options = (first.options ?? []).map((o, i) => ({
    id: o.id ?? `opt-${i}`,
    label: o.label ?? String(i),
  }));
  return {
    kind: "ask",
    title: "Need a decision",
    ask: {
      prompt: String(first.question ?? first.prompt ?? input.question ?? "Need a decision"),
      options: options.length ? options : [{ id: "ok", label: "Continue" }],
    },
    sdkSessionId: sessionId,
  };
}
