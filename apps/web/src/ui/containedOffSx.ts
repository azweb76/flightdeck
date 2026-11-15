import { useEffect, useState } from "react";

export const containedOffSx = {
  "&.MuiButton-contained.Mui-disabled": {
    backgroundColor: "#d2d2d7",
    color: "#6e6e73",
    boxShadow: "none",
  },
  "html.dark &.MuiButton-contained.Mui-disabled": {
    backgroundColor: "#3a3a3c",
    color: "#a1a1a6",
  },
};

export function containedOffStyle(off: boolean, dark: boolean): { backgroundColor: string; color: string } | undefined {
  if (!off) return undefined;
  return dark
    ? { backgroundColor: "#3a3a3c", color: "#a1a1a6" }
    : { backgroundColor: "#d2d2d7", color: "#6e6e73" };
}

export function useHtmlDark(): boolean {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.classList.contains("dark"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}
