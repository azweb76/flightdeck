import { Box } from "@primer/react";
import type { Issue } from "@flightdeck/shared";
import { api } from "../api/index.ts";

export function RepoChips({ issue, onChange }: { issue: Issue; onChange: () => void }) {
  if (issue.repoWarning === "none") return null;
  const guesses = issue.repoGuesses ?? issue.repos;
  if (guesses.length === 0) {
    return <Box sx={{ color: "fg.muted", mb: 2 }}>No repo label. Pick a GitHub repo to start.</Box>;
  }
  return (
    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
      {guesses.map((g) => (
        <Box
          as="button"
          key={`${g.owner}/${g.name}`}
          onClick={() => void api.pickIssueRepo(issue.id, g.owner, g.name).then(onChange)}
          sx={{
            border: "1px solid",
            borderColor: "border.default",
            borderRadius: 100,
            px: 3,
            py: 1,
            bg: "canvas.default",
            cursor: "pointer",
          }}
        >
          {g.owner}/{g.name}
        </Box>
      ))}
    </Box>
  );
}
