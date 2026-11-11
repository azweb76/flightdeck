/** One GraphQL search page: open PRs with CI, reviews, and closing issues. */
export const PR_SEARCH_QUERY = `query($q:String!,$after:String){viewer{login}search(query:$q,type:ISSUE,first:50,after:$after){pageInfo{hasNextPage endCursor}nodes{...on PullRequest{number title body url createdAt updatedAt isDraft headRefName author{login}repository{nameWithOwner}headRepository{nameWithOwner isFork viewerPermission}reviewDecision reviewRequests(first:10){nodes{requestedReviewer{...on User{login}}}}reviewThreads(first:40){nodes{isResolved}}closingIssuesReferences(first:20){nodes{number title url repository{nameWithOwner}}}commits(last:1){nodes{commit{statusCheckRollup{state}}}}}}}}`;

export const VIEWER_LOGIN_QUERY = `query{viewer{login}}`;

/** GraphQL search does not reliably expand @me; use the viewer login. */
export function prSearchQueries(opts: { authored: boolean; review: boolean; login: string }): string[] {
  const login = opts.login.trim();
  if (!login || (!opts.authored && !opts.review)) return [];
  const base = "is:pr is:open archived:false";
  const queries: string[] = [];
  if (opts.authored) queries.push(`${base} author:${login}`);
  if (opts.review) queries.push(`${base} review-requested:${login}`);
  return queries;
}
