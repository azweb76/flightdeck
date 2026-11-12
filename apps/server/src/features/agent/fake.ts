import type { AgentDriver, AgentEvent } from "./types.ts";

const DRAFT = {
  title: "Export invoices as CSV",
  goal: "Finance needs a CSV export of invoices from the web app.",
  acceptance: "- GET /export returns CSV\n- Auth required",
  files: "apps/web/src/export.ts, apps/server/src/invoices.ts",
  approach: "Add an export route and a download button on the invoices page.",
  outOfScope: "PDF export and scheduled email.",
  testPlan: "Unit test the CSV rows; click the download in demo.",
};

export function createFakeDriver(): AgentDriver {
  return {
    async *run(opts): AsyncIterable<AgentEvent> {
      const lower = opts.prompt.toLowerCase();
      if (lower.includes("first turn") || !lower.includes("answer:")) {
        yield {
          kind: "ask",
          title: "Need a decision",
          ask: {
            prompt: "Is this mostly a backend API change or a UI change?",
            options: [
              { id: "api", label: "Backend API" },
              { id: "ui", label: "UI" },
            ],
          },
        };
        yield { kind: "text", title: "assistant", detail: "I read the repo. Which area should we focus on?" };
        return;
      }
      yield {
        kind: "text",
        title: "assistant",
        detail: `Updated the draft with a CSV export for finance.\n\n\`\`\`json\n${JSON.stringify(DRAFT, null, 2)}\n\`\`\``,
      };
      yield { kind: "done", title: "session finished", detail: JSON.stringify(DRAFT) };
    },
  };
}
