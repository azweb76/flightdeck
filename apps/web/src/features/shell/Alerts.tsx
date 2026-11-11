import { Box, Button, CounterLabel, Text } from "@primer/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AppNotification } from "@flightdeck/shared";
import { api, subscribeEvents } from "../api/index.ts";

export function Alerts() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const nav = useNavigate();

  function load() {
    void api.notifications().then((n) => {
      if (n.unread > unread && typeof Notification !== "undefined" && Notification.permission === "granted") {
        const first = n.notifications.find((x) => !x.read);
        if (first) new Notification(first.title, { body: first.body });
      }
      setUnread(n.unread);
      setItems(n.notifications);
    });
  }

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
    load();
    return subscribeEvents(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box sx={{ position: "relative" }}>
      <Button onClick={() => setOpen((o) => !o)}>
        Alerts {unread ? <CounterLabel>{unread}</CounterLabel> : null}
      </Button>
      {open ? (
        <Box
          sx={{
            position: "absolute",
            right: 0,
            mt: 2,
            width: 320,
            bg: "canvas.default",
            border: "1px solid",
            borderColor: "border.default",
            borderRadius: 2,
            p: 2,
            zIndex: 5,
          }}
        >
          {items.length === 0 ? <Text sx={{ color: "fg.muted" }}>No notifications</Text> : null}
          {items.map((n) => (
            <Box
              as="button"
              key={n.id}
              onClick={() => {
                if (n.href) nav(n.href);
                setOpen(false);
              }}
              sx={{ display: "block", width: "100%", textAlign: "left", bg: "transparent", border: 0, py: 2, cursor: "pointer" }}
            >
              <Text sx={{ fontWeight: n.read ? 400 : 600 }}>{n.title}</Text>
              <Text sx={{ display: "block", color: "fg.muted", fontSize: 0 }}>{n.body}</Text>
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
