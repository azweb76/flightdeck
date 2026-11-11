import { Box, Button, MenuItem, Paper, Stack, TextField } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import type { Issue } from "@flightdeck/shared";
import { api } from "../../../features/api/index.ts";
import { suggestions, tokenAt, type Suggest } from "./autocomplete.ts";
import { loadDraft, saveDraft } from "./drafts.ts";
import { MarkdownView } from "./MarkdownView.tsx";

function useEditorState(id: string, value: string) {
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);
  const [items, setItems] = useState<Suggest[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const area = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    setText(loadDraft(id) ?? value);
  }, [id, value]);
  useEffect(() => {
    void api.issues({}).then((r) => setIssues(r.issues)).catch(() => undefined);
  }, []);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setMode((m) => (m === "preview" ? "edit" : "preview"));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return { mode, setMode, text, setText, focused, setFocused, items, setItems, issues, area };
}

export function MarkdownEditor({
  id,
  value,
  onChange,
  readOnly,
  minRows = 12,
}: {
  id: string;
  value: string;
  onChange?: (next: string) => void;
  readOnly?: boolean;
  minRows?: number;
}) {
  const { mode, setMode, text, setText, focused, setFocused, items, setItems, issues, area } = useEditorState(
    id,
    value,
  );

  if (readOnly) return <MarkdownView markdown={text} />;

  function commit(next: string) {
    setText(next);
    onChange?.(next);
    saveDraft(id, next);
  }

  function toEdit(caret?: number) {
    setMode("edit");
    requestAnimationFrame(() => {
      const el = area.current;
      if (!el) return;
      el.focus();
      const pos = Math.max(0, Math.min(el.value.length, caret ?? el.value.length));
      el.setSelectionRange(pos, pos);
    });
  }

  if (mode === "preview") {
    return (
      <Paper variant="outlined" sx={{ p: 2, minHeight: 200 }} onClick={(e) => toEdit(clickCaret(text, e))}>
        <MarkdownView markdown={text} />
      </Paper>
    );
  }

  return (
    <EditPane
      area={area}
      text={text}
      minRows={minRows}
      focused={focused}
      items={items}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        setMode("preview");
      }}
      onChange={(next, caret) => {
        commit(next);
        const tok = tokenAt(next, caret);
        setItems(tok ? suggestions(tok.token, issues) : []);
      }}
      onKey={(e) => {
        if (e.key === "Escape") setMode("preview");
      }}
      onPick={(s) => {
        const el = area.current;
        if (!el) return;
        const tok = tokenAt(text, el.selectionStart);
        if (!tok) return;
        commit(text.slice(0, tok.start) + s.id + text.slice(el.selectionStart));
        setItems([]);
      }}
    />
  );
}

function clickCaret(text: string, e: React.MouseEvent<HTMLElement>): number {
  const box = e.currentTarget.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (e.clientY - box.top) / Math.max(1, box.height)));
  return Math.floor(ratio * text.length);
}

function EditPane({
  area,
  text,
  minRows,
  focused,
  items,
  onFocus,
  onBlur,
  onChange,
  onKey,
  onPick,
}: {
  area: React.RefObject<HTMLTextAreaElement | null>;
  text: string;
  minRows: number;
  focused: boolean;
  items: Suggest[];
  onFocus: () => void;
  onBlur: () => void;
  onChange: (next: string, caret: number) => void;
  onKey: (e: React.KeyboardEvent) => void;
  onPick: (s: Suggest) => void;
}) {
  return (
    <Box>
      {focused ? (
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <WrapBtn label="B" wrap="**" area={area} text={text} onChange={onChange} />
          <WrapBtn label="I" wrap="_" area={area} text={text} onChange={onChange} />
          <WrapBtn label="Code" wrap="`" area={area} text={text} onChange={onChange} />
        </Stack>
      ) : null}
      <TextField
        inputRef={area}
        value={text}
        multiline
        minRows={minRows}
        fullWidth
        autoFocus
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKey}
        onChange={(e) => onChange(e.target.value, e.target.selectionStart ?? 0)}
      />
      {items.length ? (
        <Paper variant="outlined" sx={{ mt: 1 }}>
          {items.map((s) => (
            <MenuItem
              key={s.id}
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(s);
              }}
            >
              {s.label}
            </MenuItem>
          ))}
        </Paper>
      ) : null}
    </Box>
  );
}

function WrapBtn({
  label,
  wrap,
  area,
  text,
  onChange,
}: {
  label: string;
  wrap: string;
  area: React.RefObject<HTMLTextAreaElement | null>;
  text: string;
  onChange: (next: string, caret: number) => void;
}) {
  return (
    <Button
      size="small"
      variant="outlined"
      onMouseDown={(e) => {
        e.preventDefault();
        const el = area.current;
        if (!el) return;
        const a = el.selectionStart;
        const b = el.selectionEnd;
        onChange(text.slice(0, a) + wrap + text.slice(a, b) + wrap + text.slice(b), b + wrap.length);
      }}
    >
      {label}
    </Button>
  );
}
