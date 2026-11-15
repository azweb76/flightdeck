import { Button, type ButtonProps } from "@mui/material";
import { containedOffStyle, containedOffSx, useHtmlDark } from "./containedOffSx.ts";

export function ContainedButton(props: ButtonProps) {
  const { disabled, sx, style, ...rest } = props;
  const dark = useHtmlDark();
  const off = Boolean(disabled);
  return (
    <Button
      {...rest}
      variant="contained"
      disabled={disabled}
      sx={[containedOffSx, sx]}
      style={{ ...style, ...containedOffStyle(off, dark) }}
    />
  );
}
