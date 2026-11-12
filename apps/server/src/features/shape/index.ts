import { draftToMarkdown, type ShapeSession } from "@flightdeck/shared";
import { getAgentDriver } from "../agent/index.ts";
import { detectClaudeConfig, claudeSdkEnv } from "../claude/index.ts";
import { ensureClone } from "../clone/index.ts";
import { publish } from "../events/index.ts";
import { loadIssue } from "../issues/index.ts";
import { getSettings } from "../settings/index.ts";
import { mergeDraft } from "./draft.ts";
import { shapePrompt } from "./prompts.ts";
import { addMessage, createSession, getSession, patchDraft, saveSession } from "./session.ts";

export { getSession } from "./session.ts";
export { saveShapedIssue } from "./save.ts";

export async function startShape(input: { repoSlug: string; issueId?: string; idea?: string }): Promise<ShapeSession> {
  const [owner, name] = input.repoSlug.split("/");
  if (!owner || !name) throw new Error("Pick a repo as owner/name");
  await ensureClone(owner, name);
  const session = createSession(input.repoSlug, input.issueId);
  const issue = input.issueId ? loadIssue(input.issueId) : undefined;
  if (issue) {
    session.draft.title = issue.title;
    session.draft.goal = issue.body;
    saveSession(session);
  }
  const opener = input.idea?.trim() || (issue ? `Refine ${issue.key}: ${issue.title}` : "Let's shape this change.");
  addMessage(session, { role: "user", text: opener });
  await runTurn(session, { idea: input.idea, issueBody: issue?.body });
  return session;
}

export async function replyShape(id: string, text: string): Promise<ShapeSession> {
  const session = getSession(id);
  if (!session) throw new Error("Session not found");
  addMessage(session, { role: "user", text });
  const issue = session.issueId ? loadIssue(session.issueId) : undefined;
  await runTurn(session, { issueBody: issue?.body, reply: text });
  return session;
}

async function runTurn(
  session: ShapeSession,
  extra: { idea?: string; issueBody?: string; reply?: string },
): Promise<void> {
  session.status = "running";
  saveSession(session);
  publish("shape.updated", { id: session.id });
  const settings = getSettings();
  const claude = await detectClaudeConfig();
  const [owner, name] = session.repoSlug.split("/");
  const cwd = owner && name ? (await ensureClone(owner, name)).localPath : undefined;
  const history = session.messages.map((m) => `${m.role}: ${m.text}`).join("\n");
  const prompt = shapePrompt({ ...extra, draft: session.draft, history });
  let asked = false;
  for await (const ev of getAgentDriver().run({
    prompt,
    cwd: process.env.FLIGHTDECK_DEMO === "1" ? undefined : cwd,
    model: settings.model,
    env: claudeSdkEnv(claude),
  })) {
    if (ev.kind === "text" && ev.detail) {
      patchDraft(session, mergeDraft(session.draft, ev.detail));
      addMessage(session, { role: "assistant", text: ev.detail });
    }
    if (ev.kind === "ask" && ev.ask) {
      asked = true;
      addMessage(session, { role: "assistant", text: ev.ask.prompt, options: ev.ask.options });
    }
    if (ev.kind === "done" && ev.detail) patchDraft(session, mergeDraft(session.draft, ev.detail));
  }
  session.status = asked ? "asking" : "ready";
  saveSession(session);
  publish("shape.updated", { id: session.id });
}

export function previewMarkdown(id: string): string {
  const session = getSession(id);
  if (!session) throw new Error("Session not found");
  return draftToMarkdown(session.draft);
}
