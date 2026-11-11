import { Chip, Stack, Typography } from "@mui/material";
import type { Issue } from "@flightdeck/shared";
import { api } from "../api/index.ts";

export function RepoChips({ issue, onChange }: { issue: Issue; onChange: () => void }) {
  if (issue.repoWarning === "none") return null;
  const guesses = issue.repoGuesses ?? issue.repos;
  if (guesses.length === 0) {
    return <Typography color="text.secondary">No repo label. Pick a GitHub repo to start.</Typography>;
  }
  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mb: 2, gap: 1 }}>
      {guesses.map((g) => (
        <Chip
          key={`${g.owner}/${g.name}`}
          clickable
          variant="outlined"
          label={`${g.owner}/${g.name}`}
          onClick={() =>
            void api.pickIssueRepo(issue.id, g.owner, g.name, g.label ?? `${g.owner}/${g.name}`).then(onChange)
          }
        />
      ))}
    </Stack>
  );
}
