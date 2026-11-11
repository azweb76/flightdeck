import { useEffect } from "react";
import type { NextItem } from "@flightdeck/shared";
import { api } from "../api/index.ts";
import { nextKeyAction } from "./keys.ts";

export function useNextKeys(
  items: NextItem[],
  cursor: number,
  setCursor: (n: number | ((c: number) => number)) => void,
  setExpanded: (id: string | undefined) => void,
  load: () => void,
) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      const action = nextKeyAction(e.key, typing);
      if (!action) return;
      const item = items[cursor];
      if (action.kind === "down") {
        setCursor((c) => Math.min(items.length - 1, c + 1));
        setExpanded(undefined);
      }
      if (action.kind === "up") {
        setCursor((c) => Math.max(0, c - 1));
        setExpanded(undefined);
      }
      if (action.kind === "expand" && item) setExpanded(item.id);
      if (action.kind === "option" && item?.action === "answer" && item.runId) {
        const opt = item.question?.options[action.n - 1];
        if (opt) void api.answerRun(item.runId, opt.label).then(load);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, cursor, load, setCursor, setExpanded]);
}
