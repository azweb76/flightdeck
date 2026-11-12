import type { AgentDriver, AgentEvent, AgentRunOpts } from "./types.ts";

type SdkQuery = (args: {
  prompt: string;
  options?: Record<string, unknown>;
}) => AsyncIterable<Record<string, unknown>>;

export const SHAPE_TOOLS = ["Read", "Glob", "Grep", "AskUserQuestion", "AskUser"] as const;

/** Real Agent SDK driver. Shaping is read-only plus AskUserQuestion. */
export function createSdkDriver(queryFn?: SdkQuery): AgentDriver {
  return {
    async *run(opts: AgentRunOpts): AsyncIterable<AgentEvent> {
      const query = queryFn ?? (await loadQuery());
      const handle = query({
        prompt: opts.prompt,
        options: {
          cwd: opts.cwd,
          model: opts.model,
          permissionMode: "dontAsk",
          settingSources: ["user", "project"],
          allowedTools: [...SHAPE_TOOLS],
          env: opts.env,
          canUseTool: canUseShapeTool,
        },
      });
      for await (const msg of handle) {
        if (opts.abort?.aborted) {
          yield { kind: "error", title: "aborted" };
          return;
        }
        yield* mapSdkMessage(msg);
      }
    },
  };
}

/** PermissionResult.allow requires updatedInput; pass the original tool input through. */
export async function canUseShapeTool(
  name: string,
  input: Record<string, unknown>,
): Promise<
  | { behavior: "allow"; updatedInput: Record<string, unknown> }
  | { behavior: "deny"; message: string }
> {
  if (!(SHAPE_TOOLS as readonly string[]).includes(name)) {
    return { behavior: "deny", message: "Shaping is read-only" };
  }
  return { behavior: "allow", updatedInput: input };
}

async function loadQuery(): Promise<SdkQuery> {
  const mod = (await import("@anthropic-ai/claude-agent-sdk")) as { query: SdkQuery };
  return mod.query;
}

export function* mapSdkMessage(msg: Record<string, unknown>): Generator<AgentEvent> {
  const type = String(msg.type ?? "");
  if (type === "assistant") {
    const content = (msg.message as { content?: unknown[] } | undefined)?.content ?? [];
    for (const part of content) {
      const p = part as { type?: string; text?: string; name?: string; input?: Record<string, unknown> };
      if (p.type === "text" && p.text) yield { kind: "text", title: "assistant", detail: p.text };
      if (p.type === "tool_use" && (p.name === "AskUserQuestion" || p.name === "AskUser")) {
        yield askFrom(p.input ?? {});
      }
    }
  }
  if (type === "result") yield { kind: "done", title: "session finished", detail: String(msg.result ?? "") };
}

function askFrom(input: Record<string, unknown>): AgentEvent {
  const questions = Array.isArray(input.questions) ? input.questions : [input];
  const options: { id: string; label: string }[] = [];
  const prompts: string[] = [];
  for (const raw of questions) {
    const q = raw as { question?: string; prompt?: string; options?: { id?: string; label?: string }[] };
    prompts.push(String(q.question ?? q.prompt ?? ""));
    for (const [i, o] of (q.options ?? []).entries()) {
      options.push({ id: o.id ?? `opt-${i}`, label: o.label ?? String(i) });
    }
  }
  return {
    kind: "ask",
    title: "Need a decision",
    ask: {
      prompt: prompts.filter(Boolean).join("\n") || "Need a decision",
      options: options.length ? options : [{ id: "ok", label: "Continue" }],
    },
  };
}
