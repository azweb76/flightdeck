import { Box } from "@mui/material";
import type { SVGProps } from "react";

function Glyph({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden {...props}>
      {children}
    </svg>
  );
}

export function ToolGlyph({ tool }: { tool: string }) {
  const name = tool.toLowerCase();
  const glyph =
    name === "read" ? <ReadG /> :
    name === "edit" ? <EditG /> :
    name === "write" ? <WriteG /> :
    name === "bash" ? <BashG /> :
    name === "grep" ? <GrepG /> :
    name === "task" || name === "agent" ? <TaskG /> :
    <EditG />;
  return (
    <Box sx={{ width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", color: "text.secondary" }}>
      {glyph}
    </Box>
  );
}

function ReadG() {
  return (
    <Glyph>
      <path d="M3 3.5h10v9H3z" stroke="currentColor" strokeWidth="1.25" />
      <path d="M5 6h6M5 8.5h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </Glyph>
  );
}
function EditG() {
  return (
    <Glyph>
      <path d="M3.5 12.5 12 4l1.5 1.5-8.5 8.5H3.5v-1.5Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
    </Glyph>
  );
}
function WriteG() {
  return (
    <Glyph>
      <path d="M4 13h8M5 3.5h6v7H5z" stroke="currentColor" strokeWidth="1.25" />
    </Glyph>
  );
}
function BashG() {
  return (
    <Glyph>
      <path d="M4 5.5 7 8l-3 2.5M8.5 11.5H12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </Glyph>
  );
}
function GrepG() {
  return (
    <Glyph>
      <circle cx="7" cy="7" r="3.25" stroke="currentColor" strokeWidth="1.25" />
      <path d="M9.8 9.8 13 13" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </Glyph>
  );
}
function TaskG() {
  return (
    <Glyph>
      <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.25" />
      <path d="M8 5.5v3l2 1.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </Glyph>
  );
}
