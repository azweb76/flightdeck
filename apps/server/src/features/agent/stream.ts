import type { SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";

export type SdkUserMessage = SDKUserMessage;

export function userText(text: string): SDKUserMessage {
  return {
    type: "user",
    message: { role: "user", content: text },
    parent_tool_use_id: null,
    session_id: "",
  };
}

export function toolResult(toolUseId: string, content: string): SDKUserMessage {
  return {
    type: "user",
    message: {
      role: "user",
      content: [{ type: "tool_result", tool_use_id: toolUseId, content }],
    },
    parent_tool_use_id: toolUseId,
    session_id: "",
  };
}

/** Open-ended async iterable used as the SDK prompt so we can inject later turns. */
export class MessageStream implements AsyncIterable<SDKUserMessage> {
  private queue: SDKUserMessage[] = [];
  private wait?: (result: IteratorResult<SDKUserMessage>) => void;
  private closed = false;

  push(msg: SDKUserMessage): void {
    if (this.closed) return;
    if (this.wait) {
      const wait = this.wait;
      this.wait = undefined;
      wait({ value: msg, done: false });
      return;
    }
    this.queue.push(msg);
  }

  close(): void {
    this.closed = true;
    this.wait?.({ value: undefined as unknown as SDKUserMessage, done: true });
    this.wait = undefined;
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<SDKUserMessage> {
    for (;;) {
      if (this.queue.length > 0) {
        yield this.queue.shift()!;
        continue;
      }
      if (this.closed) return;
      const next = await new Promise<IteratorResult<SDKUserMessage>>((resolve) => {
        this.wait = resolve;
      });
      if (next.done) return;
      yield next.value;
    }
  }
}
