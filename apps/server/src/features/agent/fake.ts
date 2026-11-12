import type { IssueDraft } from "@flightdeck/shared";
import type { AgentDriver, AgentEvent } from "./types.ts";

export function createFakeDriver(): AgentDriver {
  return {
    async *run(opts): AsyncIterable<AgentEvent> {
      const idea = extractIdea(opts.prompt);
      if (opts.prompt.toLowerCase().includes("first turn") || !opts.prompt.toLowerCase().includes("answer:")) {
        yield {
          kind: "ask",
          title: "Need a decision",
          ask: {
            prompt: `I read the repo. Is “${shortTitle(idea)}” mostly a backend API change or a UI change?`,
            options: [
              { id: "api", label: "Backend API" },
              { id: "ui", label: "UI" },
            ],
          },
        };
        return;
      }
      const focus = opts.prompt.match(/answer:\s*(.+)/i)?.[1]?.trim() || "Backend API";
      const draft = draftFrom(idea, focus);
      yield {
        kind: "text",
        title: "assistant",
        detail: `Updated the draft for ${draft.title}.\n\n\`\`\`json\n${JSON.stringify(draft, null, 2)}\n\`\`\``,
      };
      yield { kind: "done", title: "session finished", detail: JSON.stringify(draft) };
    },
  };
}

export function extractIdea(prompt: string): string {
  const fresh = prompt.match(/New idea:\n([\s\S]*?)(?:\nExisting issue:|\nCurrent draft|$)/);
  if (fresh?.[1]?.trim()) return fresh[1].trim();
  const existing = prompt.match(/Existing issue:\n([\s\S]*?)(?:\nCurrent draft|$)/);
  if (existing?.[1]?.trim()) return existing[1].trim();
  const firstUser = prompt.match(/^user: (.+)$/m);
  return firstUser?.[1]?.trim() || "Untitled change";
}

function shortTitle(idea: string): string {
  const line = idea.split("\n").find((l) => l.trim()) ?? idea;
  return line.replace(/^Refine [^:]+:\s*/, "").slice(0, 72);
}

function draftFrom(idea: string, focus: string): IssueDraft {
  const title = shortTitle(idea);
  const csv = /csv|invoice/i.test(idea);
  const ui = /ui/i.test(focus);
  return {
    title,
    goal: csv ? `${idea}\nFinance needs a CSV export of invoices from the web app.` : idea.split("\n").slice(0, 6).join("\n"),
    acceptance: csv ? "- GET /export returns CSV\n- Auth required" : `- ${title} works end to end\n- Auth and errors are covered`,
    files: csv ? "apps/web/src/export.ts, apps/server/src/invoices.ts" : ui ? "apps/web/src" : "apps/server/src, apps/web/src",
    approach: csv
      ? `${focus}: Add an export route and a download button on the invoices page.`
      : `${focus}: implement ${title} against the existing repo layout.`,
    outOfScope: csv ? "PDF export and scheduled email." : "Unrelated refactors.",
    testPlan: csv ? "Unit test the CSV rows; click the download in demo." : "Unit tests plus a demo click-through.",
  };
}
