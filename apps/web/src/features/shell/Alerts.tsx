import { Badge, Box, IconButton, Menu, MenuItem, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AppNotification } from "@flightdeck/shared";
import { api, subscribeEvents } from "../api/index.ts";
import { BellIcon } from "../ui/icons.tsx";

export function Alerts() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
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
    return subscribeEvents((type) => {
      if (!type || type === "notifications.updated" || type === "questions.updated") load();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)} aria-label="Alerts">
        <Badge badgeContent={unread} color="error" overlap="circular">
          <BellIcon />
        </Badge>
      </IconButton>
      <Menu open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)}>
        {items.length === 0 ? <MenuItem disabled>No notifications</MenuItem> : null}
        {items.map((n) => (
          <MenuItem
            key={n.id}
            onClick={() => {
              if (n.href) nav(n.href);
              setAnchor(null);
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: n.read ? 400 : 600 }}>{n.title}</Typography>
              <Typography variant="caption" color="text.secondary">
                {n.body}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
