import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App.tsx";
import "./contained-disabled.css";
import { theme } from "./theme.ts";

const containedOffCss =
  "html:not(.dark) .MuiButton-contained.Mui-disabled{background:#d2d2d7 !important;background-color:#d2d2d7 !important;color:#6e6e73 !important}html.dark .MuiButton-contained.Mui-disabled,html.dark .MuiDialog-root .MuiButton-contained.Mui-disabled{background:#3a3a3c !important;background-color:#3a3a3c !important;color:#a1a1a6 !important}html.dark .MuiButton-outlined.Mui-disabled{color:#f5f5f7 !important;border-color:#d2d2d7 !important}";

function pinContainedOffCss(): void {
  const id = "fd-contained-off";
  const apply = () => {
    let node = document.getElementById(id);
    if (!node) {
      node = document.createElement("style");
      node.id = id;
      node.textContent = containedOffCss;
    }
    if (document.head.lastElementChild !== node) document.head.appendChild(node);
  };
  apply();
  new MutationObserver(apply).observe(document.head, { childList: true });
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

pinContainedOffCss();
createRoot(root).render(
  <StrictMode>
    <ThemeProvider theme={theme} defaultMode="system">
      <CssBaseline />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
