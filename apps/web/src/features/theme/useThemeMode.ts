import { useCallback, useEffect, useState } from "react";
import type { ThemeMode } from "@flightdeck/shared";
import { api } from "../api/index.ts";

const KEY = "flightdeck-theme";

export function useThemeMode(): { mode: ThemeMode; setMode: (m: ThemeMode) => void } {
  const [mode, setModeState] = useState<ThemeMode>(readLocal);

  useEffect(() => {
    void api
      .settings()
      .then((s) => {
        setModeState(s.theme);
        localStorage.setItem(KEY, s.theme);
      })
      .catch(() => undefined);
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    localStorage.setItem(KEY, m);
    void api.saveSettings({ theme: m }).catch(() => undefined);
  }, []);

  return { mode, setMode };
}

function readLocal(): ThemeMode {
  const v = localStorage.getItem(KEY);
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}
