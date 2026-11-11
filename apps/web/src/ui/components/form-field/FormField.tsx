import { FormHelperText, Stack, TextField, type TextFieldProps } from "@mui/material";
import { useId, type ReactNode } from "react";
import { FieldLabel } from "./FieldLabel.tsx";

export type FormFieldProps = Omit<TextFieldProps, "label" | "helperText" | "variant"> & {
  label: ReactNode;
  helperText?: ReactNode;
};

/** Label above a compact outlined input. Pass no `label` into the inner TextField. */
export function FormField({ label, helperText, required, id, fullWidth = true, ...input }: FormFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <Stack sx={{ width: fullWidth ? "100%" : undefined, minWidth: 0 }} spacing={0}>
      <FieldLabel htmlFor={fieldId} required={required}>
        {label}
      </FieldLabel>
      <TextField id={fieldId} required={required} fullWidth={fullWidth} {...input} />
      {helperText ? (
        <FormHelperText component="div" sx={{ mx: 0, mt: "4px", mb: 0 }}>
          {helperText}
        </FormHelperText>
      ) : null}
    </Stack>
  );
}
