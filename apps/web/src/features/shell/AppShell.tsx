import { Box, NavList, Text } from "@primer/react";
import { APP_NAME, type Repo } from "@flightdeck/shared";
import { NavLink, Outlet, useSearchParams } from "react-router-dom";
import { Palette } from "../palette/index.ts";
import { NeedsYouBanner } from "./NeedsYouBanner.tsx";

const NAV = [
  { to: "/issues", label: "Issues" },
  { to: "/runs", label: "Runs" },
  { to: "/reviews", label: "Reviews" },
  { to: "/stats", label: "Stats" },
  { to: "/settings", label: "Settings" },
];

export function AppShell({ repos }: { repos: Repo[] }) {
  const pinned = repos.filter((r) => r.pinned);
  const [params] = useSearchParams();
  const activeRepo = params.get("repo");

  return (
    <Box sx={{ display: "flex", minHeight: "100%", bg: "canvas.default" }}>
      <Box
        as="nav"
        sx={{
          width: 220,
          flexShrink: 0,
          bg: "canvas.subtle",
          borderRight: "1px solid",
          borderColor: "border.default",
          py: 3,
          px: 2,
        }}
      >
        <Text as="h1" sx={{ fontSize: 2, fontWeight: 600, px: 2, mb: 3 }}>
          {APP_NAME}
        </Text>
        <NavList>
          {NAV.map((item) => (
            <NavList.Item as={NavLink} key={item.to} to={item.to}>
              {item.label}
            </NavList.Item>
          ))}
        </NavList>
        <Text
          sx={{
            display: "block",
            mt: 4,
            px: 2,
            fontSize: 0,
            fontWeight: 600,
            color: "fg.muted",
            letterSpacing: "0.04em",
          }}
        >
          PINNED REPOS
        </Text>
        <NavList>
          {pinned.map((r) => {
            const slug = `${r.owner}/${r.name}`;
            return (
              <NavList.Item
                as={NavLink}
                key={r.id}
                to={`/issues?repo=${encodeURIComponent(slug)}`}
                aria-current={activeRepo === slug ? "page" : undefined}
              >
                {slug}
              </NavList.Item>
            );
          })}
        </NavList>
        {pinned.length === 0 ? (
          <Text sx={{ display: "block", px: 2, mt: 2, fontSize: 1, color: "fg.subtle" }}>
            Pin a repo in Settings
          </Text>
        ) : null}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <NeedsYouBanner />
        <Outlet />
      </Box>
      <Palette />
    </Box>
  );
}
