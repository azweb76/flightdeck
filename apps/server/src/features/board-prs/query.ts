/** One GraphQL search page: open PRs with CI, reviews, and closing issues. */
export const PR_SEARCH_QUERY = `query($q:String!,$after:String){viewer{login}search(query:$q,type:ISSUE,first:50,after:$after){pageInfo{hasNextPage endCursor}nodes{...on PullRequest{number title body url state createdAt updatedAt isDraft headRefName author{login}repository{nameWithOwner}headRepository{nameWithOwner isFork viewerPermission}reviewDecision reviewRequests(first:10){nodes{requestedReviewer{...on User{login}}}}reviewThreads(first:40){nodes{isResolved}}closingIssuesReferences(first:20){nodes{number title url repository{nameWithOwner}}}commits(last:1){nodes{commit{statusCheckRollup{state}}}}}}}}`;

export const VIEWER_LOGIN_QUERY = `query{viewer{login}}`;

/** GraphQL search does not reliably expand @me; use the viewer login. */
export function prSearchQueries(opts: {
  authored: boolean;
  review: boolean;
  login: string;
  sinceDay?: string;
}): string[] {
  const login = opts.login.trim();
  if (!login || (!opts.authored && !opts.review)) return [];
  const since = opts.sinceDay ?? isoDay(-7);
  const open = "is:pr is:open archived:false";
  const recent = `is:pr archived:false (is:merged OR is:closed) updated:>=${since}`;
  const queries: string[] = [];
  if (opts.authored) {
    queries.push(`${open} author:${login}`);
    queries.push(`${recent} author:${login}`);
  }
  if (opts.review) {
    queries.push(`${open} review-requested:${login}`);
    queries.push(`${recent} reviewed-by:${login}`);
  }
  return queries;
}

export function isoDay(offsetDays: number, now = new Date()): string {
  return new Date(now.getTime() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}
