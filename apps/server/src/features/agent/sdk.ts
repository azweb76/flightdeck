import type { AgentDriver, AgentEvent, AgentRunOpts } from "./types.ts";

type SdkQuery = (args: {
  prompt: string;
  options?: Record<string, unknown>;
}) => AsyncIterable<Record<string, unknown>>;

export const SHAPE_TOOLS = ["Read", "Glob", "Grep", "AskUserQuestion", "AskUser"] as const;
export const PLAN_TOOLS = SHAPE_TOOLS;
export const REVIEW_TOOLS = ["Read", "Glob", "Grep"] as const;
export const IMPLEMENT_TOOLS = ["Read", "Glob", "Grep", "Edit", "Write", "Bash", "AskUserQuestion", "AskUser"] as const;

/** Real Agent SDK driver. Shaping is read-only plus AskUserQuestion. */
export function createSdkDriver(queryFn?: SdkQuery): AgentDriver {
  return {
    async *run(opts: AgentRunOpts): AsyncIterable<AgentEvent> {
      const query = queryFn ?? (await loadQuery());
      const tools = toolsFor(opts.role);
      const ac = abortControllerFor(opts.abort);
      try {
        const handle = query({
          prompt: opts.prompt,
          options: {
            cwd: opts.cwd,
            model: opts.model,
            permissionMode: "dontAsk",
            settingSources: ["user", "project"],
            allowedTools: [...tools],
            env: opts.env,
            abortController: ac,
            canUseTool: (name: string, input: Record<string, unknown>) => canUseTool(opts.role, name, input),
          },
        });
        for await (const msg of handle) {
          if (opts.abort?.aborted) return;
          yield* mapSdkMessage(msg);
        }
      } catch (err) {
        if (opts.abort?.aborted) return;
        throw err;
      }
    },
  };
}

function abortControllerFor(signal?: AbortSignal): AbortController {
  const ac = new AbortController();
  if (!signal) return ac;
  if (signal.aborted) ac.abort();
  else signal.addEventListener("abort", () => ac.abort(), { once: true });
  return ac;
}

export function toolsFor(role: AgentRunOpts["role"] = "shape"): readonly string[] {
  if (role === "implement") return IMPLEMENT_TOOLS;
  if (role === "review" || role === "pr-review") return REVIEW_TOOLS;
  return PLAN_TOOLS;
}

/** PermissionResult.allow requires updatedInput; pass the original tool input through. */
export async function canUseShapeTool(
  name: string,
  input: Record<string, unknown>,
): Promise<
  | { behavior: "allow"; updatedInput: Record<string, unknown> }
  | { behavior: "deny"; message: string }
> {
  return canUseTool("shape", name, input);
}

export async function canUseTool(
  role: AgentRunOpts["role"] = "shape",
  name: string,
  input: Record<string, unknown>,
): Promise<
  | { behavior: "allow"; updatedInput: Record<string, unknown> }
  | { behavior: "deny"; message: string }
> {
  if (!toolsFor(role).includes(name)) {
    return { behavior: "deny", message: role === "implement" ? "Tool not allowed" : "This session is read-only" };
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
  if (type === "result") {
    const cost = Number(msg.total_cost_usd ?? (msg.usage as { total_cost_usd?: number } | undefined)?.total_cost_usd ?? 0);
    if (cost > 0) yield { kind: "usage", title: "usage", costUsd: cost };
    yield { kind: "done", title: "session finished", detail: String(msg.result ?? "") };
  }
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
