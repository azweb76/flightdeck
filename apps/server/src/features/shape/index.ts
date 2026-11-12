import { draftToMarkdown, type ChatMessage, type ShapeSession } from "@flightdeck/shared";
import { getAgentDriver, type AgentEvent } from "../agent/index.ts";
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
  if (!input.issueId && !input.idea?.trim()) throw new Error("Write an idea first");
  await ensureClone(owner, name);
  const session = createSession(input.repoSlug, input.issueId);
  const issue = input.issueId ? loadIssue(input.issueId) : undefined;
  if (issue) {
    session.draft.title = issue.title;
    session.draft.goal = issue.body;
    saveSession(session);
  }
  const opener = input.idea?.trim() || `Refine ${issue?.key}: ${issue?.title}`;
  addMessage(session, { role: "user", text: opener });
  await runTurn(session, { idea: input.idea, issueBody: issue?.body });
  return getSession(session.id) ?? session;
}

export async function replyShape(id: string, text: string): Promise<ShapeSession> {
  const session = getSession(id);
  if (!session) throw new Error("Session not found");
  if (session.savedKey) throw new Error("This draft is already saved");
  if (session.status === "running") return session;
  const lastUser = [...session.messages].reverse().find((m) => m.role === "user");
  if (lastUser?.text === text) return session;
  addMessage(session, { role: "user", text });
  const issue = session.issueId ? loadIssue(session.issueId) : undefined;
  await runTurn(session, { issueBody: issue?.body, reply: text });
  return getSession(session.id) ?? session;
}

async function runTurn(
  session: ShapeSession,
  extra: { idea?: string; issueBody?: string; reply?: string },
): Promise<void> {
  session.status = "running";
  emit(session);
  const settings = getSettings();
  const claude = await detectClaudeConfig();
  const [owner, name] = session.repoSlug.split("/");
  const cwd = owner && name ? (await ensureClone(owner, name)).localPath : undefined;
  const history = session.messages.map((m) => `${m.role}: ${m.text}`).join("\n");
  let asked = false;
  for await (const ev of getAgentDriver().run({
    prompt: shapePrompt({ ...extra, draft: session.draft, history }),
    cwd: process.env.FLIGHTDECK_DEMO === "1" ? undefined : cwd,
    model: settings.model,
    env: claudeSdkEnv(claude),
  })) {
    asked = applyEvent(session, ev) || asked;
    emit(session);
  }
  session.status = asked ? "asking" : "ready";
  emit(session);
}

function applyEvent(session: ShapeSession, ev: AgentEvent): boolean {
  if (ev.kind === "text" && ev.detail) {
    patchDraft(session, mergeDraft(session.draft, ev.detail));
    mergeAssistant(session, ev.detail);
  }
  if (ev.kind === "ask" && ev.ask) {
    mergeAssistant(session, ev.ask.prompt, ev.ask.options);
    return true;
  }
  if (ev.kind === "done" && ev.detail) patchDraft(session, mergeDraft(session.draft, ev.detail));
  return false;
}

function mergeAssistant(session: ShapeSession, text: string, options?: ChatMessage["options"]): void {
  const last = session.messages.at(-1);
  if (last?.role === "assistant") {
    if (text && !last.text.includes(text)) last.text = [last.text, text].filter(Boolean).join("\n");
    if (options?.length) last.options = options;
    saveSession(session);
    return;
  }
  addMessage(session, { role: "assistant", text, options });
}

function emit(session: ShapeSession): void {
  saveSession(session);
  publish("shape.updated", { id: session.id, session: getSession(session.id) ?? session });
}

export function previewMarkdown(id: string): string {
  const session = getSession(id);
  if (!session) throw new Error("Session not found");
  return draftToMarkdown(session.draft);
}
