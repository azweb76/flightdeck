import { streamSSE } from "hono/streaming";
import type { Hono } from "hono";
import { subscribe } from "../features/events/index.ts";

export function mountSse(app: Hono): void {
  app.get("/api/events", (c) =>
    streamSSE(c, async (stream) => {
      await stream.writeSSE({ data: JSON.stringify({ type: "hello", at: new Date().toISOString() }) });
      const unsub = subscribe(async (ev) => {
        await stream.writeSSE({ data: JSON.stringify(ev) });
      });
      const tick = setInterval(() => {
        void stream.writeSSE({ event: "ping", data: "" });
      }, 15_000);
      await new Promise<void>((resolve) => {
        stream.onAbort(() => {
          clearInterval(tick);
          unsub();
          resolve();
        });
      });
    }),
  );
}
