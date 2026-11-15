import { Button, type ButtonProps } from "@mui/material";
import { mergeSx } from "./mergeSx.ts";

export function ContainedButton(props: ButtonProps) {
  const { sx, ...rest } = props;
  return <Button {...rest} variant="contained" sx={mergeSx(sx)} />;
}
