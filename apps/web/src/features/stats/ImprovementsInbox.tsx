import { useEffect, useState } from "react";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import type { Improvement } from "@flightdeck/shared";
import { api } from "../api/index.ts";

export function ImprovementsInbox() {
  const [items, setItems] = useState<Improvement[]>([]);
  useEffect(() => {
    void api.improvements().then((r) => setItems(r.improvements));
  }, []);
  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h3">Improvements inbox</Typography>
      {items.length === 0 ? <Typography color="text.secondary">No session reviews yet.</Typography> : null}
      {items.map((it) => (
        <Box key={it.id} sx={{ border: "1px solid", borderColor: "divider", p: 3, borderRadius: 1, mt: 2 }}>
          <Stack direction="row" spacing={1}>
            <Chip size="small" label={it.kind} />
            <Chip size="small" variant="outlined" label={it.status} />
          </Stack>
          <Typography sx={{ fontWeight: 600, mt: 2 }}>{it.title}</Typography>
          <Typography color="text.secondary">{it.detail}</Typography>
          {it.status === "proposed" ? (
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button
                onClick={() =>
                  void api.decideImprovement(it.id, "approved").then(() =>
                    api.improvements().then((r) => setItems(r.improvements)),
                  )
                }
              >
                Approve
              </Button>
              <Button
                onClick={() =>
                  void api.decideImprovement(it.id, "rejected").then(() =>
                    api.improvements().then((r) => setItems(r.improvements)),
                  )
                }
              >
                Reject
              </Button>
            </Stack>
          ) : null}
        </Box>
      ))}
    </Box>
  );
}
