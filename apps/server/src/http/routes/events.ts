import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { subscribe } from "../../features/events/index.ts";

export function eventRoutes(): Hono {
  const app = new Hono();
  app.get("/", (c) =>
    streamSSE(c, async (stream) => {
      await stream.writeSSE({ event: "hello", data: JSON.stringify({ ok: true }) });
      const off = subscribe(async (event) => {
        await stream.writeSSE({ event: event.type, data: JSON.stringify(event) });
      });
      const ping = setInterval(() => {
        void stream.writeSSE({ event: "ping", data: "{}" });
      }, 15_000);
      await new Promise<void>((resolve) => {
        stream.onAbort(() => {
          clearInterval(ping);
          off();
          resolve();
        });
      });
    }),
  );
  return app;
}
