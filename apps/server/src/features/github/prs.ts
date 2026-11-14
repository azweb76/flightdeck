import { createOctokit, githubCall, type FetchFn } from "./octokit.ts";

export async function createDraftPr(
  token: string,
  fetchFn: FetchFn,
  owner: string,
  name: string,
  input: { title: string; body: string; head: string; base: string },
): Promise<{ number: number; url: string }> {
  const octokit = createOctokit(token, fetchFn);
  const res = await githubCall(() =>
    octokit.rest.pulls.create({
      owner,
      repo: name,
      title: input.title,
      body: input.body,
      head: input.head,
      base: input.base,
      draft: true,
    }),
  );
  return { number: res.data.number, url: res.data.html_url };
}

export async function commentIssue(
  token: string,
  fetchFn: FetchFn,
  owner: string,
  name: string,
  number: number,
  body: string,
): Promise<void> {
  const octokit = createOctokit(token, fetchFn);
  await githubCall(() => octokit.rest.issues.createComment({ owner, repo: name, issue_number: number, body }));
}
