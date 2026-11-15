import { createTheme } from "@mui/material/styles";

const focus = {
  "&.Mui-focusVisible": { outline: "3px solid #2997ff", outlineOffset: 2 },
};

const inputFocus = {
  "&:has(.MuiInputBase-input:focus-visible)": { outline: "3px solid #2997ff", outlineOffset: 2 },
};

const containedOff = { backgroundColor: "#c5dcf5", color: "#1d1d1f" };
const containedOffDark = { backgroundColor: "#2a6cb3", color: "#f5f5f7" };
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
        action: { disabled: "rgba(29,29,31,0.78)", disabledBackground: "#c5dcf5" },
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
        action: { disabled: "#f5f5f7", disabledBackground: "#2a6cb3" },
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
    MuiCssBaseline: { styleOverrides: { body: { minHeight: "100vh" } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
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
          "@media (prefers-color-scheme: dark)": { "&.Mui-disabled": containedOffDark },
          ".dark &.Mui-disabled": containedOffDark,
          '[data-mui-color-scheme="dark"] &.Mui-disabled': containedOffDark,
        },
        outlined: {
          "&.Mui-disabled": outlinedOff,
          "@media (prefers-color-scheme: dark)": { "&.Mui-disabled": outlinedOffDark },
          ".dark &.Mui-disabled": outlinedOffDark,
          '[data-mui-color-scheme="dark"] &.Mui-disabled': outlinedOffDark,
        },
        text: {
          "&.Mui-disabled": { color: "rgba(29,29,31,0.62)" },
          "@media (prefers-color-scheme: dark)": { "&.Mui-disabled": { color: "rgba(245,245,247,0.78)" } },
          ".dark &.Mui-disabled": { color: "rgba(245,245,247,0.78)" },
        },
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
