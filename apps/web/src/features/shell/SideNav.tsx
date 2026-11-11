import { Box, Button, Stack, Typography } from "@mui/material";
import { APP_NAME, type Repo } from "@flightdeck/shared";
import { NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { hideAskingFooter } from "./askingFooter.ts";

export function SideNav({
  repos,
  counts,
  asking,
}: {
  repos: Repo[];
  counts: { issues: number; runs: number; reviews: number };
  asking?: { prompt: string; href: string };
}) {
  const pinned = repos.filter((r) => r.pinned);
  const [params] = useSearchParams();
  const activeRepo = params.get("repo");
  const nav = useNavigate();
  const loc = useLocation();
  const hideFooter = hideAskingFooter(loc.pathname, asking?.href);
  const items = [
    { to: "/issues", label: "Issues", count: counts.issues },
    { to: "/runs", label: "Runs", count: counts.runs },
    { to: "/reviews", label: "Reviews", count: counts.reviews },
    { to: "/stats", label: "Stats" },
    { to: "/settings", label: "Settings" },
  ];
  return (
    <Box
      component="nav"
      sx={{
        width: 220,
        flexShrink: 0,
        bgcolor: "background.paper",
        borderRight: "1px solid",
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <Typography sx={{ fontWeight: 600, px: 3, py: 3, fontSize: 15 }}>{APP_NAME}</Typography>
      <Stack sx={{ px: 1, gap: 0.5 }}>
        {items.map((item) => (
          <NavRow key={item.to} to={item.to} label={item.label} count={item.count} askingDot={item.to === "/runs" && hideFooter} />
        ))}
      </Stack>
      <Typography sx={{ mt: 4, px: 3, fontSize: 11, fontWeight: 600, color: "text.secondary", letterSpacing: "0.04em" }}>
        PINNED REPOS
      </Typography>
      <Stack sx={{ px: 1, gap: 0.5, mt: 1 }}>
        {pinned.map((r) => {
          const slug = `${r.owner}/${r.name}`;
          return (
            <Button
              key={r.id}
              component={NavLink}
              to={`/issues?repo=${encodeURIComponent(slug)}`}
              fullWidth
              sx={{
                justifyContent: "flex-start",
                minHeight: 28,
                py: 0,
                color: activeRepo === slug ? "primary.main" : "text.primary",
                fontWeight: activeRepo === slug ? 600 : 400,
              }}
            >
              {slug}
            </Button>
          );
        })}
        {pinned.length === 0 ? (
          <Typography sx={{ px: 2, color: "text.secondary" }}>Pin a repo in Settings</Typography>
        ) : null}
      </Stack>
      <Box sx={{ flex: 1 }} />
      <AskingFooter asking={hideFooter ? undefined : asking} onOpen={(href) => nav(href)} />
    </Box>
  );
}

function AskingFooter({
  asking,
  onOpen,
}: {
  asking?: { prompt: string; href: string };
  onOpen: (href: string) => void;
}) {
  if (!asking) return null;
  return (
    <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider", bgcolor: "background.default" }}>
      <Typography sx={{ fontWeight: 600, mb: 1 }}>Agent asking</Typography>
      <Typography sx={{ color: "text.secondary", mb: 1 }}>{asking.prompt}</Typography>
      <Button size="small" variant="contained" onClick={() => onOpen(asking.href)}>
        Open
      </Button>
    </Box>
  );
}

function NavRow({ to, label, count, askingDot }: { to: string; label: string; count?: number; askingDot?: boolean }) {
  return (
    <Button
      component={NavLink}
      to={to}
      fullWidth
      sx={{
        justifyContent: "space-between",
        minHeight: 28,
        py: 0,
        color: "text.primary",
        "&.active": { bgcolor: "action.selected", fontWeight: 600 },
      }}
    >
      <span>{label}</span>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {askingDot ? <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "warning.main" }} /> : null}
        {count != null ? <Typography component="span">{count}</Typography> : null}
      </Box>
    </Button>
  );
}
