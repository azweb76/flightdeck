import { AppBar, Box, Container, Stack, Tab, Tabs, Toolbar, Typography } from "@mui/material";
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
  const current = NAV.find((n) => n.match.includes(loc.pathname) || loc.pathname.startsWith("/shape")) ?? NAV[0];
  const value = current?.to === "/" && loc.pathname.startsWith("/shape") ? "/" : current?.to;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar
        position="static"
        elevation={0}
        color="inherit"
        sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}
      >
        <Toolbar sx={{ gap: { xs: 2, md: 5 }, minHeight: 72, px: { xs: 3, md: 5 } }}>
          <Stack>
            <Typography variant="h6">Flightdeck</Typography>
            <Typography variant="caption" color="text.secondary">
              Shape a goal, then wait to start
            </Typography>
          </Stack>
          <Tabs value={value} sx={{ minHeight: 64 }}>
            {NAV.map((n) => (
              <Tab key={n.to} value={n.to} label={n.label} component={Link} to={n.to} sx={{ minHeight: 64, px: 2.5 }} />
            ))}
          </Tabs>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 6, px: { xs: 3, md: 4 } }}>
        <Outlet />
      </Container>
    </Box>
  );
}
