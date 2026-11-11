import type { AgentDriver, AgentEvent, AgentRunOpts } from "./types.ts";

type FakeOpts = { ask?: boolean; fail?: boolean; majorFirst?: boolean; delayMs?: number };

/** Deterministic driver for tests, demo, and Linux CI. Emits Zod-shaped JSON. */
export function createFakeDriver(opts: FakeOpts = {}): AgentDriver {
  let reviews = 0;
  return {
    async *run(req: AgentRunOpts): AsyncIterable<AgentEvent> {
      const step = async (): Promise<boolean> => {
        if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
        else await Promise.resolve();
        return Boolean(req.abort?.aborted);
      };
      const promptText = await promptTextFrom(req.prompt);
      yield { kind: "text", title: `${req.role} started`, detail: promptText.slice(0, 240) };
      if (await step()) {
        yield { kind: "error", title: "aborted", detail: "session aborted" };
        return;
      }
      yield { kind: "tool", title: "Read", tool: "Read", path: "CLAUDE.md" };
      if (opts.ask) {
        yield askEvent();
        return;
      }
      if (opts.fail) {
        yield { kind: "error", title: "Tool failed", detail: "simulated tool error" };
        return;
      }
      if (req.role === "reviewer" && !isPrReviewPrompt(promptText)) reviews += 1;
      yield jsonEvent(payload(req, reviews, opts.majorFirst === true, promptText));
      yield { kind: "usage", title: "usage", tokensIn: 1200, tokensOut: 400, usd: 0.012 };
      yield { kind: "done", title: `${req.role} finished`, sdkSessionId: req.resumeSessionId ?? "fake-session" };
    },
  };
}

async function promptTextFrom(prompt: AgentRunOpts["prompt"]): Promise<string> {
  if (typeof prompt === "string") return prompt;
  const first = await prompt[Symbol.asyncIterator]().next();
  if (first.done) return "";
  const content = (first.value as { message?: { content?: unknown } })?.message?.content;
  return typeof content === "string" ? content : "";
}

function jsonEvent(obj: unknown): AgentEvent {
  return { kind: "text", title: "assistant", detail: `\`\`\`json\n${JSON.stringify(obj)}\n\`\`\`` };
}

function askEvent(): AgentEvent {
  return {
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
}

function implementPayload(prompt: string): unknown {
  const applied = prompt.includes("Applied prompt version:")
    ? prompt.slice(prompt.indexOf("Applied prompt version:"))
    : "";
  const runTests = /test/i.test(applied) && !/skip tests/i.test(applied);
  return {
    kind: "implement",
    summary: runTests ? "Updated the worktree and ran tests" : "Updated the worktree",
    filesChanged: ["src/index.ts"],
    testsRun: runTests ? ["pnpm test"] : [],
    remaining: runTests ? "" : "tests not run",
  };
}

function payload(req: AgentRunOpts, reviews: number, majorFirst: boolean, prompt: string): unknown {
      if (req.role === "refiner") return refinePayload(prompt);
  if (req.role === "planner") {
    return { kind: "plan", summary: "Ship the change", steps: ["Implement", "Add tests"], files: [] };
  }
  if (req.role === "implementer") return implementPayload(prompt);
  if (isPrReviewPrompt(prompt)) {
    return {
      kind: "pr_review",
      comments: [{ path: "src/index.ts", line: 1, body: "Prefer a streaming cursor here." }],
    };
  }
  if (req.role === "reviewer") return reviewPayload(reviews, majorFirst);
  return {
    kind: "session_review",
    waste: 3,
    backtracking: 1,
    prQuality: 8,
    stuck: 2,
    missingContext: 4,
    notes: "Synthetic session review",
    findings: [{ title: "Long Read loop", detail: "The implementer reread CLAUDE.md twice.", excerpt: "Read CLAUDE.md" }],
    improvements: [
      {
        kind: "prompt_edit",
        title: "Tighten implementer prompt",
        detail: "Run tests before finishing a round.",
        patch: "After each edit, run the repo test command.",
      },
      {
        kind: "claude_md_note",
        title: "Note from session",
        detail: "Prefer streaming APIs for exports.",
        patch: "Prefer streaming APIs for exports.",
      },
    ],
  };
}

function isPrReviewPrompt(prompt: string): boolean {
  return prompt.includes("inline review comments") || prompt.includes("teammate PR");
}

function refinePayload(prompt: string): unknown {
  if (prompt.includes("kind\":\"refine_goal") || prompt.includes("Write the goal") || prompt.includes("Write a goal")) {
    return {
      kind: "refine_goal",
      markdown: "## Goal\nShip the requested change.\n\n## Acceptance criteria\n- Behavior matches the answers\n\n## Constraints\n- Follow CLAUDE.md",
    };
  }
  return {
    kind: "refine_questions",
    questions: [
      {
        id: "scope",
        prompt: "What is in scope for this change?",
        options: [
          { id: "minimal", label: "Smallest change that meets the issue" },
          { id: "full", label: "Full production-ready behavior" },
        ],
        allowOther: true,
      },
      {
        id: "compat",
        prompt: "How should we treat existing callers?",
        options: [
          { id: "compat", label: "Keep backward compatibility" },
          { id: "break", label: "A breaking change is OK" },
        ],
        allowOther: true,
      },
    ],
  };
}

function reviewPayload(reviews: number, majorFirst: boolean): unknown {
  if (majorFirst && reviews === 1) {
    return {
      kind: "review",
      passed: false,
      findings: [{ severity: "major", title: "Missing tests", detail: "No 429 coverage" }],
      notes: "",
    };
  }
  if (!majorFirst && reviews === 1) {
    return {
      kind: "review",
      passed: false,
      findings: [{ severity: "minor", title: "Polish", detail: "Tighten names" }],
      notes: "",
    };
  }
  return { kind: "review", passed: true, findings: [], notes: "Looks good" };
}
