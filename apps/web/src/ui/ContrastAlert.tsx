import { Alert, type AlertProps } from "@mui/material";

/** Error fill that stays >= 4.5:1 in light and dark (MUI error.main on white is ~3.4:1 in dark). */
export function ContrastAlert(props: AlertProps) {
  return (
    <Alert
      severity="error"
      variant="outlined"
      {...props}
      sx={{
        bgcolor: "#8b1219",
        color: "#fff",
        borderColor: "#8b1219",
        "& .MuiAlert-icon": { color: "#fff" },
        ".dark &": { bgcolor: "#5c1014", borderColor: "#5c1014", color: "#fff" },
        ...((props.sx as object) ?? {}),
      }}
    />
  );
}
