import { useEffect, useState } from "react";
import { Box, Button, Heading, Label, Text } from "@primer/react";
import type { Improvement } from "@flightdeck/shared";
import { api } from "../api/index.ts";

export function ImprovementsInbox() {
  const [items, setItems] = useState<Improvement[]>([]);
  useEffect(() => {
    void api.improvements().then((r) => setItems(r.improvements));
  }, []);
  return (
    <Box sx={{ mt: 4 }}>
      <Heading as="h3" sx={{ fontSize: 2 }}>Improvements inbox</Heading>
      {items.length === 0 ? <Text sx={{ color: "fg.muted" }}>No session reviews yet.</Text> : null}
      {items.map((it) => (
        <Box key={it.id} sx={{ border: "1px solid", borderColor: "border.default", p: 3, borderRadius: 2, mt: 2 }}>
          <Label>{it.kind}</Label> <Label variant="secondary">{it.status}</Label>
          <Text sx={{ display: "block", fontWeight: 600, mt: 2 }}>{it.title}</Text>
          <Text sx={{ color: "fg.muted", display: "block" }}>{it.detail}</Text>
          {it.status === "proposed" ? (
            <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
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
            </Box>
          ) : null}
        </Box>
      ))}
    </Box>
  );
}
