import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from "@mui/material";
import { MarkdownEditor } from "../../ui/components/markdown/MarkdownEditor.tsx";
import { ToolRow } from "./ToolRow.tsx";
import { formatDuration, formatTokens } from "./toolMeta.ts";
import type { PhaseGroup } from "./timeline.ts";

export function PhaseSection({ group, expanded }: { group: PhaseGroup; expanded: boolean }) {
  const title = labelFor(group.role);
  const tokens = group.tokensIn + group.tokensOut;
  return (
    <Accordion defaultExpanded={expanded} disableGutters sx={{ "&:before": { display: "none" }, bgcolor: "transparent", boxShadow: "none" }}>
      <AccordionSummary sx={{ minHeight: 32, px: 1, "& .MuiAccordionSummary-content": { my: 0.5, alignItems: "center", gap: 2 } }}>
        <StatusDot status={group.status} />
        <Typography sx={{ fontWeight: 600, minWidth: 110 }}>{title}</Typography>
        <Typography color="text.secondary">{formatDuration(group.startedAt, group.endedAt)}</Typography>
        {tokens ? <Typography color="text.secondary">{formatTokens(tokens)} tok</Typography> : null}
        {group.usd ? <Typography color="text.secondary">${group.usd.toFixed(2)}</Typography> : null}
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0 }}>
        {group.items.map((item) => {
          if (item.type === "user") {
            return <UserBubble key={item.event.id} text={item.event.detail} />;
          }
          if (item.type === "assistant") {
            return (
              <Box key={item.event.id} sx={{ px: 1, py: 1 }}>
                <MarkdownEditor id={`tx-${item.event.id}`} value={item.event.detail} readOnly />
              </Box>
            );
          }
          return <ToolRow key={item.event.id} event={item.event} result={item.result} />;
        })}
      </AccordionDetails>
    </Accordion>
  );
}

function labelFor(role: PhaseGroup["role"]): string {
  if (role === "session_reviewer") return "Session reviewer";
  if (role === "run") return "Run";
  return role[0]!.toUpperCase() + role.slice(1);
}

function StatusDot({ status }: { status: PhaseGroup["status"] }) {
  const color = status === "done" ? "success.main" : status === "running" ? "info.main" : "text.disabled";
  return <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />;
}

function UserBubble({ text }: { text: string }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "flex-end", px: 1, py: 1 }}>
      <Box sx={{ maxWidth: "80%", bgcolor: "action.selected", borderRadius: 2, px: 2, py: 1 }}>
        <Typography sx={{ whiteSpace: "pre-wrap" }}>{text}</Typography>
      </Box>
    </Box>
  );
}
