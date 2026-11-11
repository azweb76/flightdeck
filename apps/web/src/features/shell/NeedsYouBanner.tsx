import { Box, Button, Text } from "@primer/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, subscribeEvents } from "../api/index.ts";

export function NeedsYouBanner() {
  const [text, setText] = useState<string>();
  const [href, setHref] = useState<string>();
  const nav = useNavigate();
  useEffect(() => {
    function load() {
      void api.notifications().then((n) => {
        const q = n.questions[0];
        if (q) {
          setText(q.prompt);
          setHref(`/runs/${q.runId}`);
        } else {
          setText(undefined);
        }
      });
    }
    load();
    return subscribeEvents(load);
  }, []);
  if (!text || !href) return null;
  return (
    <Box sx={{ bg: "attention.subtle", px: 3, py: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Text>Needs you: {text}</Text>
      <Button variant="primary" onClick={() => nav(href)}>
        Open question
      </Button>
    </Box>
  );
}
