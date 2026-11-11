import { FormLabel } from "@mui/material";
import type { ReactNode } from "react";

/** Static GitHub-style label above a field. Never floats into the border. */
export function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <FormLabel
      htmlFor={htmlFor}
      required={required}
      sx={{
        display: "block",
        mb: "5px",
        fontSize: 12.5,
        fontWeight: 500,
        lineHeight: 1.3,
        color: "text.primary",
      }}
    >
      {children}
    </FormLabel>
  );
}
