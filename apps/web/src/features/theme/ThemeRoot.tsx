import { CssBaseline } from "@mui/material";
import { CssVarsProvider, useColorScheme } from "@mui/material/styles";
import { useEffect, type ReactNode } from "react";
import type { ThemeMode } from "@flightdeck/shared";
import { flightdeckTheme } from "./theme.ts";

export function ThemeRoot({ mode, children }: { mode: ThemeMode; children: ReactNode }) {
  const defaultMode = mode === "dark" ? "dark" : mode === "light" ? "light" : "system";
  return (
    <CssVarsProvider theme={flightdeckTheme} defaultMode={defaultMode} modeStorageKey="flightdeck-mui-mode">
      <CssBaseline />
      <ModeSync mode={mode} />
      {children}
    </CssVarsProvider>
  );
}

function ModeSync({ mode }: { mode: ThemeMode }) {
  const { setMode } = useColorScheme();
  useEffect(() => {
    setMode(mode === "dark" ? "dark" : mode === "light" ? "light" : "system");
  }, [mode, setMode]);
  return null;
}
