import { Hono } from "hono";
import { listNotifications, markAllRead, markRead, unreadCount } from "../../features/notify/index.ts";
import { openQuestions } from "../../features/questions/store.ts";

export function notificationRoutes(): Hono {
  const app = new Hono();
  app.get("/", (c) =>
    c.json({ notifications: listNotifications(), unread: unreadCount(), questions: openQuestions() }),
  );
  app.post("/read-all", (c) => {
    markAllRead();
    return c.json({ ok: true });
  });
  app.post("/:id/read", (c) => {
    markRead(Number(c.req.param("id")));
    return c.json({ ok: true });
  });
  return app;
}
