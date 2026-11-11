import type { AgentDriver, AgentEvent, AgentRunOpts } from "./types.ts";

/** Deterministic driver for tests, demo, and Linux CI. */
export function createFakeDriver(opts: { ask?: boolean; fail?: boolean } = {}): AgentDriver {
  return {
    async *run(req: AgentRunOpts): AsyncIterable<AgentEvent> {
      yield { kind: "text", title: `${req.role} started`, detail: req.prompt.slice(0, 240) };
      yield { kind: "tool", title: "Read", tool: "Read", path: "CLAUDE.md" };
      yield { kind: "tool_result", title: "Read CLAUDE.md", tool: "Read", path: "CLAUDE.md" };
      if (req.role === "refiner") {
        yield {
          kind: "ask",
          title: "Clarifying question",
          ask: {
            prompt: "Where should the new behavior live?",
            options: [
              { id: "a", label: "Existing module" },
              { id: "b", label: "New package" },
            ],
          },
        };
      }
      if (opts.ask) {
        yield {
          kind: "ask",
          title: "Need a decision",
          ask: {
            prompt: "Should the new endpoints go under /v2?",
            options: [
              { id: "yes", label: "Yes, /v2" },
              { id: "no", label: "No, keep current paths" },
            ],
          },
        };
        return;
      }
      yield { kind: "tool", title: "Edit", tool: "Edit", path: "src/index.ts" };
      if (opts.fail) {
        yield { kind: "error", title: "Tool failed", detail: "simulated tool error" };
        return;
      }
      yield {
        kind: "usage",
        title: "usage",
        tokensIn: 1200,
        tokensOut: 400,
      };
      yield { kind: "done", title: `${req.role} finished` };
    },
  };
}
