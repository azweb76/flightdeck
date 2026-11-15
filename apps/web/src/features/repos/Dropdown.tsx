import { createContext, forwardRef, useContext, useLayoutEffect, useRef, type ReactNode } from "react";
import { Button, Paper, Stack, Typography, type PaperProps } from "@mui/material";
import { capDropdownToActions } from "./popper.ts";

export type DropdownStatus = {
  loading: boolean;
  refreshing: boolean;
  error?: string;
  detail?: string;
  empty: boolean;
  onRefresh: () => void;
};

const Ui = createContext<DropdownStatus | null>(null);

export function DropdownUi(props: { value: DropdownStatus; children: ReactNode }) {
  return <Ui.Provider value={props.value}>{props.children}</Ui.Provider>;
}

export const DropdownPaper = forwardRef<HTMLDivElement, PaperProps>(function DropdownPaper(props, ref) {
  const ui = useContext(Ui);
  const { sx, ...rest } = props;
  const local = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    capDropdownToActions(local.current);
    const id = requestAnimationFrame(() => capDropdownToActions(local.current));
    return () => cancelAnimationFrame(id);
  });
  return (
    <Paper
      {...rest}
      ref={(node) => {
        local.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      data-testid="repo-dropdown"
      sx={{ ...sx, maxHeight: 280, overflow: "hidden" }}
    >
      {ui ? <DropdownHeader ui={ui} /> : null}
      {props.children}
    </Paper>
  );
});

function DropdownHeader(props: { ui: DropdownStatus }) {
  const { ui } = props;
  return (
    <Stack spacing={1} sx={{ px: 1.5, pt: 1 }}>
      <Stack direction="row" justifyContent="flex-end">
        <Button
          size="small"
          onMouseDown={(e) => e.preventDefault()}
          onClick={ui.onRefresh}
          disabled={ui.refreshing}
          data-testid="repo-refresh"
        >
          Refresh
        </Button>
      </Stack>
      <PickerStatus {...ui} />
    </Stack>
  );
}

function PickerStatus(props: DropdownStatus) {
  if (props.loading) {
    return (
      <Typography color="text.secondary" data-testid="repo-picker-loading">
        Loading repositories…
      </Typography>
    );
  }
  if (props.error) {
    return (
      <Stack direction="row" gap={1} alignItems="center" data-testid="repo-picker-error">
        <Typography color="error">{props.error}</Typography>
        <Button size="small" onMouseDown={(e) => e.preventDefault()} onClick={props.onRefresh} data-testid="repo-picker-error-refresh">
          Refresh
        </Button>
      </Stack>
    );
  }
  if (props.detail) {
    return (
      <Typography color="text.secondary" data-testid="repo-picker-detail">
        {props.detail}
      </Typography>
    );
  }
  if (props.empty) {
    return (
      <Typography color="text.secondary" data-testid="repo-picker-empty">
        No matching repositories.
      </Typography>
    );
  }
  return null;
}
