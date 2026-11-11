import { Box } from "@mui/material";

export function ColoredDiff({ diff }: { diff: string }) {
  const lines = (diff || "No diff yet.").split("\n");
  return (
    <Box
      component="pre"
      sx={{
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 12,
        p: 2,
        m: 0,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        overflow: "auto",
      }}
    >
      {lines.map((line, i) => (
        <Box
          key={i}
          component="span"
          sx={{
            display: "block",
            whiteSpace: "pre-wrap",
            color: colorFor(line),
          }}
        >
          {line || " "}
        </Box>
      ))}
    </Box>
  );
}

function colorFor(line: string): string {
  if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("diff ") || line.startsWith("index ")) {
    return "text.secondary";
  }
  if (line.startsWith("+")) return "success.main";
  if (line.startsWith("-")) return "error.main";
  if (line.startsWith("@@")) return "primary.main";
  return "text.primary";
}
