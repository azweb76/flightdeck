import { createOctokit, githubCall, type FetchFn } from "./octokit.ts";
import type { ReviewVerdict } from "@flightdeck/shared";

export async function postPullReview(
  token: string,
  fetchFn: FetchFn,
  owner: string,
  name: string,
  number: number,
  input: {
    event: ReviewVerdict;
    body: string;
    commitId?: string;
    comments: { path: string; line: number; side?: "LEFT" | "RIGHT"; body: string }[];
  },
): Promise<void> {
  const octokit = createOctokit(token, fetchFn);
  await githubCall(() =>
    octokit.rest.pulls.createReview({
      owner,
      repo: name,
      pull_number: number,
      event: input.event,
      body: input.body,
      commit_id: input.commitId,
      comments: input.comments.map((c) => ({
        path: c.path,
        line: c.line,
        side: c.side ?? "RIGHT",
        body: c.body,
      })),
    }),
  );
}
