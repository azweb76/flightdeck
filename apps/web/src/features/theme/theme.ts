import { extendTheme } from "@mui/material/styles";

const mac = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif';
const FIELD = "#8e8e93";

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
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: { borderColor: FIELD },
        root: { fontSize: 13, backgroundColor: "var(--fd-palette-background-paper)" },
      },
    },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { minHeight: 28 } } },
  },
});
