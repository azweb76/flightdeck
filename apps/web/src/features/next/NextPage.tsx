import { Box, Button, Stack, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { NEXT_BUCKETS, type NextItem } from "@flightdeck/shared";
import { api, subscribeEvents } from "../api/index.ts";
import { BUCKET_TITLE } from "./bucketTitle.ts";
import { NextRow } from "./NextRow.tsx";
import { useNextKeys } from "./useNextKeys.ts";

export function NextPage() {
  const [items, setItems] = useState<NextItem[]>([]);
  const [cursor, setCursor] = useState(0);
  const [expanded, setExpanded] = useState<string>();
  const [selected, setSelected] = useState<string[]>([]);
  const [reply, setReply] = useState("");
  const [params] = useSearchParams();

  function load() {
    void api.next().then((r) => setItems(r.items));
  }

  useEffect(() => {
    load();
    return subscribeEvents((type) => {
      if (!type || type === "runs.updated" || type === "issues.updated" || type === "questions.updated") load();
    });
  }, []);

  useEffect(() => {
    const want = params.get("item");
    if (!want) return;
    const idx = items.findIndex((i) => i.id === want);
    if (idx >= 0) {
      setCursor(idx);
      setExpanded(want);
    }
  }, [params, items]);

  useNextKeys(items, cursor, setCursor, setExpanded, load);
  const grouped = useMemo(() => NEXT_BUCKETS.map((b) => ({ b, rows: items.filter((i) => i.bucket === b) })), [items]);

  return (
    <Box sx={{ p: 3, minHeight: "100%" }}>
      <NextToolbar items={items} cursor={cursor} selected={selected} load={load} />
      {grouped.map(({ b, rows }) =>
        rows.length ? (
          <Box key={b} sx={{ mb: 2 }}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>{BUCKET_TITLE[b]}</Typography>
            {rows.map((item) => {
              const idx = items.indexOf(item);
              return (
                <NextRow
                  key={item.id}
                  item={item}
                  selected={selected.includes(item.id)}
                  active={idx === cursor}
                  expanded={expanded === item.id}
                  reply={reply}
                  setReply={setReply}
                  onToggle={() =>
                    setSelected((s) => (s.includes(item.id) ? s.filter((x) => x !== item.id) : [...s, item.id]))
                  }
                  onExpand={() => {
                    setCursor(idx);
                    setExpanded(item.id);
                  }}
                  onChanged={load}
                />
              );
            })}
          </Box>
        ) : null,
      )}
    </Box>
  );
}

function NextToolbar({
  items,
  cursor,
  selected,
  load,
}: {
  items: NextItem[];
  cursor: number;
  selected: string[];
  load: () => void;
}) {
  const item = items[cursor];
  return (
    <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: "center" }}>
      <Typography variant="h2" sx={{ flex: 1 }}>
        Next
      </Typography>
      {selected.length > 0 ? (
        <Button variant="contained" onClick={() => void api.startNext(selected).then(load)}>
          Start {selected.length}
        </Button>
      ) : null}
      <Button size="small" onClick={() => item && void api.doneNext(item.id).then(load)}>
        Done
      </Button>
      <Button
        size="small"
        onClick={() => item && void api.snoozeNext(item.id, { until: new Date(Date.now() + 3_600_000).toISOString() }).then(load)}
      >
        Snooze 1h
      </Button>
      <Button
        size="small"
        onClick={() => item && void api.snoozeNext(item.id, { untilChange: true }).then(load)}
      >
        Snooze until change
      </Button>
    </Stack>
  );
}
