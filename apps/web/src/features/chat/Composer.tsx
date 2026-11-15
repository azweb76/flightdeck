import { Stack, TextField } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { ContainedButton } from "../../ui/ContainedButton.tsx";
import { FormField } from "../../ui/FormField.tsx";

export function Composer(props: {
  value: string;
  onChange: (v: string) => void;
  onSend: (text: string) => void;
  canSend: boolean;
  disabled: boolean;
  placeholder: string;
  inputTestId: string;
  sendTestId?: string;
  sendSx?: SxProps<Theme>;
}) {
  return (
    <FormField label="Reply">
      <Stack direction="row" gap={1} alignItems="flex-start">
        <TextField
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder}
          disabled={props.disabled}
          multiline
          minRows={1}
          maxRows={6}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (props.canSend) props.onSend(props.value);
            }
          }}
          inputProps={{ "data-testid": props.inputTestId }}
        />
        <ContainedButton
          disabled={!props.canSend}
          onClick={() => props.onSend(props.value)}
          data-testid={props.sendTestId}
          sx={props.sendSx}
        >
          Send
        </ContainedButton>
      </Stack>
    </FormField>
  );
}
