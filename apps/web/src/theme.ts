import { createTheme } from "@mui/material/styles";

const focus = {
  "&.Mui-focusVisible": { outline: "3px solid #2997ff", outlineOffset: 2 },
};

const inputFocus = {
  "&:has(.MuiInputBase-input:focus-visible)": { outline: "3px solid #2997ff", outlineOffset: 2 },
};

const containedOff = {
  "--variant-containedBg": "var(--mui-palette-action-disabledBackground) !important",
  "--variant-containedColor": "var(--mui-palette-action-disabled) !important",
  backgroundColor: "var(--mui-palette-action-disabledBackground) !important",
  color: "var(--mui-palette-action-disabled) !important",
  boxShadow: "none",
};
const outlinedOff = {
  border: "1px solid rgba(29,29,31,0.5)",
  color: "rgba(29,29,31,0.78)",
  backgroundColor: "transparent",
};
const outlinedOffDark = {
  border: "1px solid #8e8e93",
  color: "#f5f5f7",
  backgroundColor: "transparent",
};

const tooltipLight = {
  backgroundColor: "#f5f5f7",
  color: "#1d1d1f",
  border: "1px solid rgba(0,0,0,0.2)",
};
const tooltipDark = {
  backgroundColor: "#2c2c2e",
  color: "#f5f5f7",
  border: "1px solid rgba(255,255,255,0.24)",
};

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: "class" },
  colorSchemes: {
    light: {
      palette: {
        background: { default: "#f5f5f7", paper: "#ffffff" },
        primary: { main: "#0071e3" },
        error: { main: "#d70015", light: "#ff3b30" },
        warning: { main: "#e6a700", light: "#ffd60a" },
        text: { primary: "#1d1d1f", secondary: "#6e6e73" },
        divider: "rgba(0,0,0,0.08)",
        action: { disabled: "#6e6e73", disabledBackground: "#d2d2d7" },
      },
    },
    dark: {
      palette: {
        background: { default: "#000000", paper: "#1d1d1f" },
        primary: { main: "#2997ff" },
        error: { main: "#ff453a", light: "#ff6961" },
        warning: { main: "#ffd60a", light: "#ff9f0a" },
        text: { primary: "#f5f5f7", secondary: "#a1a1a6" },
        divider: "rgba(255,255,255,0.12)",
        action: { disabled: "#a1a1a6", disabledBackground: "#3a3a3c" },
      },
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
    h4: { fontWeight: 600, letterSpacing: "-0.03em", fontSize: "2rem" },
    h5: { fontWeight: 600, letterSpacing: "-0.02em" },
    h6: { fontWeight: 600, letterSpacing: "-0.015em" },
    body1: { fontSize: "0.975rem", lineHeight: 1.6 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 14 },
  spacing: 8,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { minHeight: "100vh" },
        ".MuiButton-contained.Mui-disabled": containedOff,
        ".MuiButton-root.MuiButton-contained.Mui-disabled": containedOff,
        ".MuiDialog-root .MuiButton-contained.Mui-disabled": containedOff,
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiBackdrop: {
      styleOverrides: { root: { backgroundColor: "rgba(0,0,0,0.5)" } },
    },
    MuiDialog: {
      defaultProps: { transitionDuration: 0 },
      styleOverrides: {
        paper: { backgroundImage: "none", padding: 8, minWidth: 380 },
      },
    },
    MuiDialogTitle: { styleOverrides: { root: { paddingBottom: 12 } } },
    MuiDialogContent: { styleOverrides: { root: { paddingTop: "16px !important" } } },
    MuiAppBar: { defaultProps: { position: "static" } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      variants: [{ props: { variant: "contained", disabled: true }, style: containedOff }],
      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingInline: 16,
          paddingBlock: 8,
          ...focus,
          "&.Mui-disabled": { opacity: 1 },
        },
        contained: {
          "&.Mui-disabled": containedOff,
        },
        outlined: {
          "&.Mui-disabled": outlinedOff,
          "@media (prefers-color-scheme: dark)": { "&.Mui-disabled": outlinedOffDark },
          ".dark &.Mui-disabled": outlinedOffDark,
        },
        text: {
          "&.Mui-disabled": { color: "rgba(29,29,31,0.62)" },
          "@media (prefers-color-scheme: dark)": { "&.Mui-disabled": { color: "rgba(245,245,247,0.78)" } },
          ".dark &.Mui-disabled": { color: "rgba(245,245,247,0.78)" },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: ({ theme: t }) => ({
          padding: "12px 16px",
          maxWidth: 420,
          fontSize: "0.8rem",
          lineHeight: 1.45,
          whiteSpace: "pre-wrap",
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          ...tooltipLight,
          ...t.applyStyles("dark", tooltipDark),
        }),
        arrow: ({ theme: t }) => ({
          color: tooltipLight.backgroundColor,
          "&::before": { backgroundColor: tooltipLight.backgroundColor, border: tooltipLight.border },
          ...t.applyStyles("dark", {
            color: tooltipDark.backgroundColor,
            "&::before": { backgroundColor: tooltipDark.backgroundColor, border: tooltipDark.border },
          }),
        }),
      },
    },
    MuiTab: { styleOverrides: { root: { ...focus } } },
    MuiChip: { styleOverrides: { root: { ...focus } } },
    MuiLink: { styleOverrides: { root: { ...focus } } },
    MuiTextField: { defaultProps: { variant: "outlined", fullWidth: true, hiddenLabel: true } },
    MuiOutlinedInput: { styleOverrides: { root: inputFocus } },
    MuiSelect: { defaultProps: { fullWidth: true } },
  },
});
