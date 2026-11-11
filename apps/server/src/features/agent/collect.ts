import type { AgentEvent, AgentRunOpts } from "./types.ts";
import { getAgentDriver } from "./driver.ts";

export type LooseResult = {
  status: "ok" | "ask" | "error";
  text: string;
  ask?: AgentEvent["ask"];
  error?: string;
};

/** Run a driver without a Flightdeck run (refiner, session review). */
export async function collectAgentOutput(opts: AgentRunOpts): Promise<LooseResult> {
  const parts: string[] = [];
  try {
    for await (const ev of getAgentDriver().run(opts)) {
      if (ev.kind === "text" && ev.detail) parts.push(ev.detail);
      if (ev.kind === "done" && ev.detail) parts.push(ev.detail);
      if (ev.kind === "ask") return { status: "ask", text: parts.join("\n"), ask: ev.ask };
      if (ev.kind === "error") {
        return { status: "error", text: parts.join("\n"), error: ev.detail ?? ev.title };
      }
    }
  } catch (err) {
    return { status: "error", text: parts.join("\n"), error: err instanceof Error ? err.message : String(err) };
  }
  return { status: "ok", text: parts.join("\n") };
}
