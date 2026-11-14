import { Box, Stack, Typography } from "@mui/material";
import type { PreflightCheck } from "@flightdeck/shared";

export function TrackerChoice(props: {
  title: string;
  testId: string;
  selected: boolean;
  block?: PreflightCheck;
  onSelect: () => void;
}) {
  const blocked = Boolean(props.block);
  return (
    <Box
      component="button"
      type="button"
      data-testid={props.testId}
      onClick={props.onSelect}
      sx={{
        display: "block",
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        p: 2,
        borderRadius: 2,
        border: 1,
        borderColor: props.selected ? "primary.main" : "divider",
        bgcolor: props.selected ? "action.selected" : "background.paper",
        color: "text.primary",
        appearance: "none",
        font: "inherit",
        opacity: 1,
      }}
    >
      <Stack spacing={0.5}>
        <Typography variant="subtitle2">
          {blocked ? `${props.title} (needs ${needsLabel(props.title)})` : props.title}
        </Typography>
        {blocked ? (
          <>
            <Typography variant="body2" color="text.secondary">
              {props.block?.detail}
            </Typography>
            {props.block?.fix ? (
              <Typography
                component="code"
                data-testid={`${props.testId}-fix`}
                sx={{
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: "0.8rem",
                  bgcolor: "action.hover",
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  alignSelf: "flex-start",
                }}
              >
                {props.block.fix}
              </Typography>
            ) : null}
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Save as a {props.title} issue.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

function needsLabel(title: string): string {
  return title === "GitHub" ? "a token" : title;
}
