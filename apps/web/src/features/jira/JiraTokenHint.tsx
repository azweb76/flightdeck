import { Link, Stack, Typography } from "@mui/material";
import { JIRA_API_TOKEN_URL } from "@flightdeck/shared";
import { openExternal } from "../external/index.ts";

export function JiraTokenHint({ keepStored }: { keepStored?: boolean }) {
  return (
    <Stack spacing={0.25}>
      {keepStored ? (
        <Typography variant="caption" color="text.secondary">
          Leave blank to keep the stored token.
        </Typography>
      ) : null}
      <Link
        href={JIRA_API_TOKEN_URL}
        variant="caption"
        underline="hover"
        onClick={(event) => {
          event.preventDefault();
          void openExternal(JIRA_API_TOKEN_URL);
        }}
      >
        Create a Jira API token
      </Link>
      <Typography variant="caption" color="text.secondary">
        Use it with the email you sign in to Jira with
      </Typography>
    </Stack>
  );
}
