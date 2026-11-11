import { extendTheme } from "@mui/material/styles";

const mac = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif';

export const flightdeckTheme = extendTheme({
  cssVarPrefix: "fd",
  colorSchemeSelector: "class",
  colorSchemes: {
    light: {
      palette: {
        background: { default: "#f5f5f7", paper: "#ffffff" },
        text: { primary: "#1d1d1f", secondary: "#3a3a3c", disabled: "#6e6e73" },
        divider: "#d2d2d7",
        primary: { main: "#0071e3", contrastText: "#ffffff" },
        warning: { main: "#c93400", contrastText: "#ffffff" },
        error: { main: "#d70015", contrastText: "#ffffff" },
        success: { main: "#248a3d", contrastText: "#ffffff" },
        info: { main: "#0071e3", contrastText: "#ffffff" },
      },
    },
    dark: {
      palette: {
        background: { default: "#1c1c1e", paper: "#2c2c2e" },
        text: { primary: "#f5f5f7", secondary: "#d1d1d6", disabled: "#8e8e93" },
        divider: "#48484a",
        primary: { main: "#0a84ff", contrastText: "#ffffff" },
        warning: { main: "#ff9f0a", contrastText: "#1c1c1e" },
        error: { main: "#ff453a", contrastText: "#ffffff" },
        success: { main: "#30d158", contrastText: "#1c1c1e" },
        info: { main: "#0a84ff", contrastText: "#ffffff" },
      },
    },
  },
  spacing: 4,
  typography: {
    fontFamily: mac,
    fontSize: 13,
    htmlFontSize: 13,
    h1: { fontSize: 20, fontWeight: 600, lineHeight: 1.25 },
    h2: { fontSize: 17, fontWeight: 600, lineHeight: 1.3 },
    h3: { fontSize: 15, fontWeight: 600 },
    body1: { fontSize: 13, lineHeight: 1.45 },
    body2: { fontSize: 12, lineHeight: 1.4 },
    button: { fontSize: 13, textTransform: "none", fontWeight: 500 },
    caption: { fontSize: 11 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "html, body, #root": { height: "100%", margin: 0 },
        body: { fontFamily: mac, fontSize: 13 },
      },
    },
    MuiTextField: { defaultProps: { size: "small", variant: "outlined" } },
    MuiInputLabel: {
      defaultProps: { shrink: true, disableAnimation: true },
      styleOverrides: {
        root: { position: "static", transform: "none", pointerEvents: "auto" },
      },
    },
    MuiOutlinedInput: {
      defaultProps: { notched: false, size: "small" },
      styleOverrides: outlinedInput(),
    },
    MuiFormLabel: {
      styleOverrides: {
        root: { fontSize: 12.5, fontWeight: 500, color: "var(--fd-palette-text-primary)" },
        asterisk: { color: "var(--fd-palette-text-secondary)", fontWeight: 400, marginLeft: 2 },
      },
    },
    MuiFormHelperText: {
      styleOverrides: { root: { marginLeft: 0, marginRight: 0, fontSize: 12 } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true, size: "small" },
      styleOverrides: { root: { minHeight: 28, paddingLeft: 10, paddingRight: 10 } },
    },
    MuiIconButton: { styleOverrides: { root: { width: 28, height: 28 } } },
    MuiChip: {
      defaultProps: { size: "small" },
      styleOverrides: { root: { height: 20, fontSize: 11 }, label: { px: 1, paddingLeft: 8, paddingRight: 8 } },
    },
    MuiTab: { styleOverrides: { root: { minHeight: 32, padding: "6px 12px" } } },
    MuiTabs: { styleOverrides: { root: { minHeight: 32 } } },
    MuiAccordion: { defaultProps: { disableGutters: true, elevation: 0, square: true } },
  },
});

function outlinedInput() {
  const ring = "0 0 0 3px color-mix(in srgb, var(--fd-palette-primary-main) 28%, transparent)";
  return {
    notchedOutline: {
      borderColor: "var(--fd-palette-divider)",
      borderWidth: 1,
      "& legend": { display: "none", width: 0, padding: 0 },
    },
    root: {
      borderRadius: 6,
      fontSize: 13,
      minHeight: 32,
      backgroundColor: "var(--fd-palette-background-paper)",
      "&.MuiInputBase-multiline": { minHeight: "unset" },
      "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "var(--fd-palette-text-secondary)" },
      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
        borderWidth: 1,
        borderColor: "var(--fd-palette-primary-main)",
      },
      "&.Mui-focused": { boxShadow: ring },
    },
    input: { padding: "6px 10px", height: 20, boxSizing: "border-box" as const },
  };
}
