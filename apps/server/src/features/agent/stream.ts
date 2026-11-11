export type SdkUserMessage = {
  type: "user";
  message: {
    role: "user";
    content: string | Array<{ type: "text"; text: string } | { type: "tool_result"; tool_use_id: string; content: string }>;
  };
};

export function userText(text: string): SdkUserMessage {
  return { type: "user", message: { role: "user", content: text } };
}

export function toolResult(toolUseId: string, content: string): SdkUserMessage {
  return {
    type: "user",
    message: {
      role: "user",
      content: [{ type: "tool_result", tool_use_id: toolUseId, content }],
    },
  };
}

/** Open-ended async iterable used as the SDK prompt so we can inject later turns. */
export class MessageStream implements AsyncIterable<SdkUserMessage> {
  private queue: SdkUserMessage[] = [];
  private wait?: (result: IteratorResult<SdkUserMessage>) => void;
  private closed = false;

  push(msg: SdkUserMessage): void {
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
    this.wait?.({ value: undefined as unknown as SdkUserMessage, done: true });
    this.wait = undefined;
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<SdkUserMessage> {
    for (;;) {
      if (this.queue.length > 0) {
        yield this.queue.shift()!;
        continue;
      }
      if (this.closed) return;
      const next = await new Promise<IteratorResult<SdkUserMessage>>((resolve) => {
        this.wait = resolve;
      });
      if (next.done) return;
      yield next.value;
    }
  }
}
