import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: "class" },
  colorSchemes: {
    light: {
      palette: {
        background: { default: "#f5f5f7", paper: "#ffffff" },
        primary: { main: "#0071e3" },
        text: { primary: "#1d1d1f", secondary: "#6e6e73" },
        divider: "rgba(0,0,0,0.08)",
      },
    },
    dark: {
      palette: {
        background: { default: "#000000", paper: "#1d1d1f" },
        primary: { main: "#2997ff" },
        text: { primary: "#f5f5f7", secondary: "#a1a1a6" },
        divider: "rgba(255,255,255,0.12)",
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
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: "none" } },
    },
    MuiDialog: {
      defaultProps: { transitionDuration: 0 },
      styleOverrides: {
        paper: {
          backgroundImage: "none",
          backgroundColor: "#ffffff",
          color: "#1d1d1f",
          padding: 8,
          minWidth: 380,
          boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
          ".dark &, [data-mui-color-scheme='dark'] &": {
            backgroundColor: "#1d1d1f",
            color: "#f5f5f7",
          },
        },
      },
    },
    MuiAppBar: {
      defaultProps: { position: "static" },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 10, paddingInline: 16, paddingBlock: 8 } },
    },
    MuiTextField: {
      defaultProps: { variant: "outlined", fullWidth: true, hiddenLabel: true },
    },
  },
});
