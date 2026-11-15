import { Alert, type AlertProps } from "@mui/material";

const FILLS = {
  error: { light: "#8b1219", dark: "#5c1014" },
  warning: { light: "#7a3e00", dark: "#5c2e00" },
  info: { light: "#0b4a6f", dark: "#0d3a56" },
} as const;

/** Fills that stay >= 4.5:1 on white text in light and dark. */
export function ContrastAlert(props: AlertProps) {
  const severity = props.severity === "warning" || props.severity === "info" ? props.severity : "error";
  const fill = FILLS[severity];
  return (
    <Alert
      {...props}
      severity={severity}
      variant="outlined"
      sx={{
        bgcolor: fill.light,
        color: "#fff",
        borderColor: fill.light,
        "& .MuiAlert-icon": { color: "#fff" },
        ".dark &": { bgcolor: fill.dark, borderColor: fill.dark, color: "#fff" },
        ...((props.sx as object) ?? {}),
      }}
    />
  );
}
