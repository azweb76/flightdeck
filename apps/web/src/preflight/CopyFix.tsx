import { IconButton, Tooltip } from "@mui/material";
import ContentCopy from "@mui/icons-material/ContentCopy";
import { useState } from "react";

export function CopyFix(props: { command: string; testId?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(props.command);
    } catch {
      /* clipboard may be unavailable */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Tooltip title={copied ? "Copied" : "Copy fix"}>
      <IconButton size="small" onClick={() => void copy()} data-testid={props.testId} aria-label="Copy fix">
        <ContentCopy fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}
