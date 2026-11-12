import { AppBar, Box, Container, Tab, Tabs, Toolbar, Typography } from "@mui/material";
import { Link, Outlet, useLocation } from "react-router-dom";

const NAV = [
  { to: "/", label: "Issues", match: ["/", "/issues"] },
  { to: "/runs", label: "Runs", match: ["/runs"] },
  { to: "/prs", label: "My PRs", match: ["/prs"] },
  { to: "/reviews", label: "Reviews", match: ["/reviews"] },
  { to: "/settings", label: "Settings", match: ["/settings"] },
];

export function AppShell() {
  const loc = useLocation();
  const shaping = loc.pathname.startsWith("/shape");
  const current = NAV.find((n) => n.match.includes(loc.pathname) || shaping) ?? NAV[0];
  const value = shaping ? "/" : current?.to;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        height: shaping ? { lg: "100vh" } : "auto",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
      }}
    >
      <AppBar
        position="static"
        elevation={0}
        color="inherit"
        sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper", flexShrink: 0 }}
      >
        <Toolbar sx={{ gap: 2, minHeight: 64, px: { xs: 2, md: 4 } }}>
          <Typography variant="h6" sx={{ flexShrink: 0 }}>
            Flightdeck
          </Typography>
          <Tabs
            value={value}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{ minHeight: 64, flex: 1 }}
          >
            {NAV.map((n) => (
              <Tab key={n.to} value={n.to} label={n.label} component={Link} to={n.to} sx={{ minHeight: 64, px: 2 }} />
            ))}
          </Tabs>
        </Toolbar>
      </AppBar>
      {shaping ? (
        <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <Outlet />
        </Box>
      ) : (
        <Container maxWidth="lg" sx={{ py: 5, px: { xs: 3, md: 4 } }}>
          <Outlet />
        </Container>
      )}
    </Box>
  );
}
