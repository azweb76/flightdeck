import { Box, Dialog, List, ListItemButton, ListSubheader, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/index.ts";

type Item = { label: string; to: string; group: string };

export function Palette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [sel, setSel] = useState(0);
  const nav = useNavigate();

  usePaletteOpen(setOpen);
  useEffect(() => {
    if (!open) return;
    setQ("");
    setSel(0);
    void loadItems().then(setItems);
  }, [open]);

  const shown = useMemo(
    () => items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase())).slice(0, 16),
    [items, q],
  );
  const groups = groupOf(shown);

  function go(item: Item) {
    nav(item.to);
    setOpen(false);
  }

  return (
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
      <Box sx={{ p: 2 }}>
        <TextField
          autoFocus
          fullWidth
          placeholder="Search or jump to…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSel(0);
          }}
          onKeyDown={(e) => onPaletteKey(e, shown, sel, setSel, go)}
        />
        <PaletteList groups={groups} shown={shown} sel={sel} onGo={go} />
      </Box>
    </Dialog>
  );
}

function usePaletteOpen(setOpen: (v: boolean | ((b: boolean) => boolean)) => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("flightdeck:palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("flightdeck:palette", onOpen);
    };
  }, [setOpen]);
}

function onPaletteKey(
  e: React.KeyboardEvent,
  shown: Item[],
  sel: number,
  setSel: (n: number | ((s: number) => number)) => void,
  go: (item: Item) => void,
) {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    setSel((s) => Math.min(shown.length - 1, s + 1));
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    setSel((s) => Math.max(0, s - 1));
  }
  if (e.key === "Enter" && shown[sel]) go(shown[sel]!);
}

function PaletteList({
  groups,
  shown,
  sel,
  onGo,
}: {
  groups: { name: string; items: Item[] }[];
  shown: Item[];
  sel: number;
  onGo: (item: Item) => void;
}) {
  return (
    <List dense sx={{ mt: 1, maxHeight: 360, overflow: "auto" }}>
      {groups.map((g) => (
        <Box key={g.name}>
          <ListSubheader disableSticky>{g.name}</ListSubheader>
          {g.items.map((item) => {
            const idx = shown.indexOf(item);
            return (
              <ListItemButton key={item.to + item.label} selected={idx === sel} onClick={() => onGo(item)}>
                <Typography>{item.label}</Typography>
              </ListItemButton>
            );
          })}
        </Box>
      ))}
    </List>
  );
}

async function loadItems(): Promise<Item[]> {
  const [iss, runs, catalog] = await Promise.all([api.issues(), api.runs(), api.repos()]);
  return [
    { label: "Next", to: "/", group: "Go to" },
    ...iss.issues.map((i) => ({
      label: `${i.key} ${i.title}`,
      to: `/issues/${encodeURIComponent(i.id)}`,
      group: "Issues",
    })),
    ...runs.runs.map((r) => ({
      label: `${r.issueKey} ${r.repoSlug}`,
      to: `/runs/${r.id}`,
      group: "Runs",
    })),
    ...catalog.repos.map((r) => ({
      label: `${r.owner}/${r.name}`,
      to: `/issues?repo=${encodeURIComponent(`${r.owner}/${r.name}`)}`,
      group: "Go to repo",
    })),
    { label: "Pull requests", to: "/prs", group: "Go to" },
    { label: "Settings", to: "/settings", group: "Go to" },
    { label: "Stats", to: "/stats", group: "Go to" },
    { label: "Reviews", to: "/reviews", group: "Go to" },
    { label: "New GitHub issue", to: "/issues/new?kind=github", group: "Create" },
    { label: "New Jira issue", to: "/issues/new?kind=jira", group: "Create" },
    { label: "Ad-hoc task", to: "/issues/new?kind=adhoc", group: "Create" },
  ];
}

function groupOf(items: Item[]): { name: string; items: Item[] }[] {
  const out: { name: string; items: Item[] }[] = [];
  for (const item of items) {
    const last = out.at(-1);
    if (last && last.name === item.group) last.items.push(item);
    else out.push({ name: item.group, items: [item] });
  }
  return out;
}
