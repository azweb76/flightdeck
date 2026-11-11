import { BaseStyles, ThemeProvider } from "@primer/react";
import type { ReactNode } from "react";
import type { ThemeMode } from "@flightdeck/shared";

export function ThemeRoot({ mode, children }: { mode: ThemeMode; children: ReactNode }) {
  const colorMode = mode === "system" ? "auto" : mode === "light" ? "day" : "night";
  return (
    <ThemeProvider colorMode={colorMode} dayScheme="light" nightScheme="dark">
      <BaseStyles>
        <style>{`html, body, #root { height: 100%; margin: 0; }`}</style>
        {children}
      </BaseStyles>
    </ThemeProvider>
  );
}
