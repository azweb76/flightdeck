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
          allowedTools: ["Read", "Edit", "Write", "Glob", "Grep", "Bash", "Agent"],
          canUseTool: async (name: string, input: Record<string, unknown>) => {
            if (!allowTool(name, input)) {
              return { behavior: "deny", message: "Blocked by Flightdeck allowlist" };
            }
            return { behavior: "allow", updatedInput: input };
          },
        },
      });
      for await (const msg of stream) {
        yield* mapSdkMessage(msg);
      }
    },
  };
}

async function loadQuery(): Promise<SdkQuery> {
  const mod = (await import("@anthropic-ai/claude-agent-sdk")) as { query: SdkQuery };
  return mod.query;
}

function* mapSdkMessage(msg: Record<string, unknown>): Generator<AgentEvent> {
  const type = String(msg.type ?? "");
  if (type === "assistant") {
    const content = (msg.message as { content?: unknown[] } | undefined)?.content ?? [];
    for (const part of content) {
      const p = part as { type?: string; text?: string; name?: string; input?: { path?: string } };
      if (p.type === "text" && p.text) yield { kind: "text", title: "assistant", detail: p.text };
      if (p.type === "tool_use") {
        yield { kind: "tool", title: p.name ?? "tool", tool: p.name, path: p.input?.path };
      }
    }
    return;
  }
  if (type === "result") {
    const usage = msg.usage as { input_tokens?: number; output_tokens?: number } | undefined;
    yield {
      kind: "usage",
      title: "usage",
      tokensIn: usage?.input_tokens,
      tokensOut: usage?.output_tokens,
    };
    yield {
      kind: "done",
      title: "session finished",
      detail: String(msg.result ?? ""),
      sdkSessionId: typeof msg.session_id === "string" ? msg.session_id : undefined,
    };
  }
}
