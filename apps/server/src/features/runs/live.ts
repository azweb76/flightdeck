import { MessageStream, toolResult, userText } from "../agent/stream.ts";

const answers = new Map<number, { resolve: (text: string) => void; reject: (err: Error) => void }>();
const queued = new Map<number, { text: string; toolUseId?: string }>();
const streams = new Map<number, MessageStream>();

export function bindStream(runId: number, stream: MessageStream): void {
  streams.set(runId, stream);
}

export function unbindLive(runId: number): void {
  streams.get(runId)?.close();
  streams.delete(runId);
  queued.delete(runId);
  const pending = answers.get(runId);
  answers.delete(runId);
  pending?.reject(new Error("session ended"));
}

export function waitForAnswer(runId: number): Promise<string> {
  const ready = queued.get(runId);
  if (ready) {
    queued.delete(runId);
    pushAnswer(runId, ready.text, ready.toolUseId);
    return Promise.resolve(ready.text);
  }
  return new Promise((resolve, reject) => {
    answers.set(runId, { resolve, reject });
  });
}

/** Returns true when a live session can take the AskUserQuestion tool result. */
export function resolveLiveAnswer(runId: number, text: string, toolUseId?: string): boolean {
  const pending = answers.get(runId);
  if (pending) {
    answers.delete(runId);
    pushAnswer(runId, text, toolUseId);
    pending.resolve(text);
    return true;
  }
  if (!streams.has(runId)) return false;
  queued.set(runId, { text, toolUseId });
  return true;
}

function pushAnswer(runId: number, text: string, toolUseId?: string): void {
  if (toolUseId) streams.get(runId)?.push(toolResult(toolUseId, text));
  else streams.get(runId)?.push(userText(text));
}

/** Inject a current-phase note into the in-flight SDK turn. */
export function pushLiveInput(runId: number, text: string): boolean {
  const stream = streams.get(runId);
  if (!stream) return false;
  stream.push(userText(text));
  return true;
}

export function hasLiveSession(runId: number): boolean {
  return streams.has(runId);
}
