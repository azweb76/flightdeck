import { useEffect, useMemo, useState } from "react";
import { Box, TextInput } from "@primer/react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/index.ts";

export function Palette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<{ label: string; to: string }[]>([]);
  const nav = useNavigate();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
      if (open) return;
      if (e.key.toLowerCase() === "r") nav(window.location.pathname);
      if (e.key.toLowerCase() === "s" && !e.metaKey) {
        /* Start is issued from the issue page */
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav, open]);

  useEffect(() => {
    if (!open) return;
    void Promise.all([api.issues(), api.runs()]).then(([iss, runs]) => {
      setItems([
        ...iss.issues.map((i) => ({ label: `Issue ${i.key} ${i.title}`, to: `/issues/${encodeURIComponent(i.id)}` })),
        ...runs.runs.map((r) => ({ label: `Run ${r.issueKey} ${r.repoSlug}`, to: `/runs/${r.id}` })),
        { label: "Settings", to: "/settings" },
        { label: "Stats", to: "/stats" },
      ]);
    });
  }, [open]);

  const shown = useMemo(
    () => items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase())).slice(0, 12),
    [items, q],
  );
  if (!open) return null;
  return (
    <Box sx={{ position: "fixed", inset: 0, bg: "rgba(0,0,0,0.4)", zIndex: 20, display: "flex", justifyContent: "center", pt: 8 }}>
      <Box sx={{ width: 520, bg: "canvas.default", borderRadius: 2, p: 3 }}>
        <TextInput autoFocus placeholder="Search or jump to…" value={q} onChange={(e) => setQ(e.target.value)} />
        {shown.map((i) => (
          <Box
            as="button"
            key={i.to}
            onClick={() => {
              nav(i.to);
              setOpen(false);
            }}
            sx={{ display: "block", width: "100%", textAlign: "left", p: 2, bg: "transparent", border: 0, cursor: "pointer" }}
          >
            {i.label}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
