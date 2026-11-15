import { Typography } from "@mui/material";

export function Markdown(props: { text: string; empty?: string }) {
  if (!props.text) {
    return (
      <Typography color="text.secondary" fontStyle="italic">
        {props.empty ?? ""}
      </Typography>
    );
  }
  return <Typography sx={{ whiteSpace: "pre-wrap" }}>{props.text}</Typography>;
}
